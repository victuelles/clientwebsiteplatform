-- Phase 3: media library (storage bucket, folders, assets, references).
--
-- Rules
--   * Anyone can read assets (the public site needs URLs and alt text); anon cannot see who
--     uploaded them (column grants).
--   * Writes follow public.can('media', <action>): create -> insert, edit -> update,
--     delete -> delete. The storage bucket uses the same rules.
--   * media_references records where an asset is used. Referenced assets cannot be deleted
--     (foreign key ON DELETE RESTRICT), and non-empty folders cannot be deleted either.

-- ---------------------------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy "Anyone can read media objects"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "Media creators can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (select public.can('media', 'create')));

create policy "Media editors can update objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (select public.can('media', 'edit')))
  with check (bucket_id = 'media' and (select public.can('media', 'edit')));

create policy "Media deleters can delete objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (select public.can('media', 'delete')));

-- ---------------------------------------------------------------------------------------------
-- media_folders
-- ---------------------------------------------------------------------------------------------

create table public.media_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  parent_id uuid references public.media_folders (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  check (parent_id is distinct from id)
);

comment on table public.media_folders is 'Folders in the media library. Only empty folders can be deleted.';

-- Folder names are unique (case-insensitive) within their parent.
create unique index media_folders_unique_name
  on public.media_folders (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(name)));

alter table public.media_folders enable row level security;

create policy "Anyone can read media folders"
  on public.media_folders for select
  to anon, authenticated
  using (true);

create policy "Media creators can create folders"
  on public.media_folders for insert
  to authenticated
  with check ((select public.can('media', 'create')) and created_by = (select auth.uid()));

create policy "Media editors can rename and move folders"
  on public.media_folders for update
  to authenticated
  using ((select public.can('media', 'edit')))
  with check ((select public.can('media', 'edit')));

create policy "Media deleters can delete folders"
  on public.media_folders for delete
  to authenticated
  using ((select public.can('media', 'delete')));

revoke truncate, references, trigger on public.media_folders from anon, authenticated;
revoke insert, update, delete on public.media_folders from anon;
revoke select on public.media_folders from anon;
grant select (id, name, parent_id, created_at) on public.media_folders to anon;

-- ---------------------------------------------------------------------------------------------
-- media_assets
-- ---------------------------------------------------------------------------------------------

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  filename text not null check (length(filename) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  alt_text text check (alt_text is null or length(alt_text) <= 500),
  caption text check (caption is null or length(caption) <= 1000),
  folder_id uuid references public.media_folders (id) on delete restrict,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.media_assets is 'Files in the media bucket, with alt text and dimensions.';

create index media_assets_folder_idx on public.media_assets (folder_id, created_at desc);
create index media_assets_created_idx on public.media_assets (created_at desc);

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;

create policy "Anyone can read media assets"
  on public.media_assets for select
  to anon, authenticated
  using (true);

create policy "Media creators can add assets"
  on public.media_assets for insert
  to authenticated
  with check ((select public.can('media', 'create')) and uploaded_by = (select auth.uid()));

create policy "Media editors can edit assets"
  on public.media_assets for update
  to authenticated
  using ((select public.can('media', 'edit')))
  with check ((select public.can('media', 'edit')));

create policy "Media deleters can delete assets"
  on public.media_assets for delete
  to authenticated
  using ((select public.can('media', 'delete')));

revoke truncate, references, trigger on public.media_assets from anon, authenticated;
revoke insert, update, delete on public.media_assets from anon;
-- The public site reads everything except who uploaded the file.
revoke select on public.media_assets from anon;
grant select (
  id, storage_path, filename, mime_type, size_bytes, width, height, alt_text, caption,
  folder_id, created_at, updated_at
) on public.media_assets to anon;
-- Nobody changes where a file lives or who uploaded it after the fact.
revoke update on public.media_assets from authenticated;
grant update (alt_text, caption, folder_id, filename) on public.media_assets to authenticated;

-- ---------------------------------------------------------------------------------------------
-- media_references: where each asset is used. Written only by security definer functions.
-- ---------------------------------------------------------------------------------------------

create table public.media_references (
  media_id uuid not null references public.media_assets (id) on delete restrict,
  entity_table text not null,
  entity_id text not null,
  field text not null,
  created_at timestamptz not null default now(),
  primary key (media_id, entity_table, entity_id, field)
);

comment on table public.media_references is
  'Where each media asset is used. Referenced assets cannot be deleted.';

create index media_references_entity_idx on public.media_references (entity_table, entity_id, field);

alter table public.media_references enable row level security;

create policy "Media viewers can see where assets are used"
  on public.media_references for select
  to authenticated
  using ((select public.can('media', 'view')));

revoke insert, update, delete, truncate, references, trigger on public.media_references
  from anon, authenticated;
revoke select on public.media_references from anon;

/**
 * Points (entity_table, entity_id, field) at media_id, replacing whatever it referenced before;
 * a null media_id removes the reference. Internal: call it from other security definer
 * functions that save records pointing at media (never exposed to the API).
 */
create function public.set_media_reference(
  entity_table text,
  entity_id text,
  field text,
  media_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.media_references r
  where r.entity_table = set_media_reference.entity_table
    and r.entity_id = set_media_reference.entity_id
    and r.field = set_media_reference.field;

  if set_media_reference.media_id is not null then
    insert into public.media_references (media_id, entity_table, entity_id, field)
    values (
      set_media_reference.media_id,
      set_media_reference.entity_table,
      set_media_reference.entity_id,
      set_media_reference.field
    );
  end if;
end;
$$;

revoke execute on function public.set_media_reference(text, text, text, uuid)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Brand assets on site_settings
-- ---------------------------------------------------------------------------------------------

alter table public.site_settings
  add constraint site_settings_logo_media_fk
    foreign key (logo_media_id) references public.media_assets (id) on delete set null,
  add constraint site_settings_logo_on_dark_media_fk
    foreign key (logo_on_dark_media_id) references public.media_assets (id) on delete set null,
  add constraint site_settings_favicon_media_fk
    foreign key (favicon_media_id) references public.media_assets (id) on delete set null,
  add constraint site_settings_og_image_media_fk
    foreign key (og_image_media_id) references public.media_assets (id) on delete set null;

-- update_site_settings now also records media references for the four brand asset fields.
create or replace function public.update_site_settings(changes jsonb)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed constant text[] := array[
    'site_name', 'tagline', 'description', 'contact_email', 'phone', 'location_label',
    'address', 'map_url', 'social_links', 'logo_media_id', 'logo_on_dark_media_id',
    'favicon_media_id', 'og_image_media_id', 'theme', 'show_top_bar', 'header_cta_label',
    'header_cta_href', 'footer_copyright', 'privacy_href', 'terms_href', 'seo_title_template',
    'seo_description', 'allow_indexing'
  ];
  media_fields constant text[] := array[
    'logo_media_id', 'logo_on_dark_media_id', 'favicon_media_id', 'og_image_media_id'
  ];
  unknown_key text;
  current_row public.site_settings;
  next_row public.site_settings;
  changed text[];
  media_field text;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can change site settings.'
      using errcode = '42501';
  end if;

  if changes is null or jsonb_typeof(changes) <> 'object' then
    raise exception 'changes must be a JSON object.'
      using errcode = '22023';
  end if;

  select key into unknown_key
  from jsonb_object_keys(changes) as key
  where key <> all (allowed)
  limit 1;
  if unknown_key is not null then
    raise exception 'Unknown or read-only setting "%".', unknown_key
      using errcode = '22023';
  end if;

  if changes ? 'site_name' and coalesce(trim(changes ->> 'site_name'), '') = '' then
    raise exception 'The site name cannot be empty.'
      using errcode = '22023';
  end if;

  select * into current_row from public.site_settings where id for update;

  -- Keys present in changes replace the current values (with type casts); others are kept.
  next_row := jsonb_populate_record(current_row, changes);

  select coalesce(array_agg(key order by key), '{}')
  into changed
  from jsonb_object_keys(changes) as key
  where to_jsonb(current_row) -> key is distinct from to_jsonb(next_row) -> key;

  if cardinality(changed) = 0 then
    return changed;
  end if;

  update public.site_settings s
  set
    site_name = next_row.site_name,
    tagline = next_row.tagline,
    description = next_row.description,
    contact_email = next_row.contact_email,
    phone = next_row.phone,
    location_label = next_row.location_label,
    address = next_row.address,
    map_url = next_row.map_url,
    social_links = next_row.social_links,
    logo_media_id = next_row.logo_media_id,
    logo_on_dark_media_id = next_row.logo_on_dark_media_id,
    favicon_media_id = next_row.favicon_media_id,
    og_image_media_id = next_row.og_image_media_id,
    theme = next_row.theme,
    show_top_bar = next_row.show_top_bar,
    header_cta_label = next_row.header_cta_label,
    header_cta_href = next_row.header_cta_href,
    footer_copyright = next_row.footer_copyright,
    privacy_href = next_row.privacy_href,
    terms_href = next_row.terms_href,
    seo_title_template = next_row.seo_title_template,
    seo_description = next_row.seo_description,
    allow_indexing = next_row.allow_indexing
  where s.id;

  foreach media_field in array media_fields loop
    if media_field = any (changed) then
      perform public.set_media_reference(
        'site_settings',
        'site',
        media_field,
        (to_jsonb(next_row) ->> media_field)::uuid
      );
    end if;
  end loop;

  perform public.log_audit(
    'settings.updated',
    'settings',
    'site_settings',
    'site',
    jsonb_build_object('fields', to_jsonb(changed))
  );

  return changed;
end;
$$;
