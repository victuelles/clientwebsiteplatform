-- Phase 4: pages made of sections (draft working copy + published snapshot), revisions, menus,
-- and contact form submissions. All content editing uses the core scope 'content'.
--
-- Media references are maintained by triggers: any JSON value under a "mediaId" key in
-- page_sections.props (and in pages.published_sections) counts as a reference, as does
-- pages.og_image_media_id. So a section or page can never forget to record its images.

create type public.page_status as enum ('draft', 'published');
create type public.submission_status as enum ('new', 'read', 'archived');

-- ---------------------------------------------------------------------------------------------
-- Media reference helpers
-- ---------------------------------------------------------------------------------------------

/** Every uuid found under a "mediaId" key anywhere in a JSON document. */
create function public.media_ids_in(doc jsonb)
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct (v #>> '{}')::uuid), '{}')
  from jsonb_path_query(coalesce(doc, 'null'::jsonb), 'strict $.**.mediaId') as v
  where jsonb_typeof(v) = 'string'
    and (v #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

/**
 * Replaces the references of (entity_table, entity_id, field) with media_ids. Ids of assets that
 * no longer exist are skipped (the renderer shows a placeholder for them). Internal only.
 */
create function public.sync_media_references(
  entity_table text,
  entity_id text,
  field text,
  media_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.media_references r
  where r.entity_table = sync_media_references.entity_table
    and r.entity_id = sync_media_references.entity_id
    and r.field = sync_media_references.field;

  insert into public.media_references (media_id, entity_table, entity_id, field)
  select distinct a.id, sync_media_references.entity_table, sync_media_references.entity_id,
         sync_media_references.field
  from public.media_assets a
  where a.id = any (coalesce(media_ids, '{}'));
end;
$$;

revoke execute on function public.media_ids_in(jsonb) from public, anon, authenticated;
revoke execute on function public.sync_media_references(text, text, text, uuid[])
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------------------------

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  slug extensions.citext not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  is_home boolean not null default false,
  status public.page_status not null default 'draft',
  -- What the public site renders. Only publish_page and friends change it.
  published_sections jsonb not null default '[]'::jsonb
    check (jsonb_typeof(published_sections) = 'array'),
  published_at timestamptz,
  seo_title text check (seo_title is null or length(seo_title) <= 200),
  seo_description text check (seo_description is null or length(seo_description) <= 300),
  og_image_media_id uuid references public.media_assets (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pages is
  'Pages: draft sections live in page_sections; the public site renders published_sections.';

create unique index pages_single_home on public.pages (is_home) where is_home;

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

create trigger pages_set_updated_by
  before update on public.pages
  for each row execute function public.set_updated_by();

-- ---------------------------------------------------------------------------------------------
-- page_sections: the draft working copy
-- ---------------------------------------------------------------------------------------------

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  type text not null check (type ~ '^[a-z][a-z0-9_]*$' and length(type) <= 50),
  sort_order integer not null check (sort_order >= 0),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object'),
  background text not null default 'white' check (background in ('white', 'light', 'navy', 'accent')),
  padding text not null default 'normal' check (padding in ('normal', 'compact', 'none')),
  anchor_id text check (anchor_id is null or (anchor_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(anchor_id) <= 60)),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint page_sections_order_unique unique (page_id, sort_order) deferrable initially deferred
);

comment on table public.page_sections is 'Draft sections of a page, in sort_order.';

create trigger page_sections_set_updated_at
  before update on public.page_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- page_revisions: published snapshots (the last 20 per page are kept)
-- ---------------------------------------------------------------------------------------------

create table public.page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  sections jsonb not null check (jsonb_typeof(sections) = 'array'),
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now()
);

create index page_revisions_page_idx on public.page_revisions (page_id, published_at desc);

-- ---------------------------------------------------------------------------------------------
-- Menus
-- ---------------------------------------------------------------------------------------------

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('header', 'footer_1', 'footer_2')),
  title text check (title is null or length(title) <= 60)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  parent_id uuid references public.menu_items (id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 80),
  -- A Link value (src/core/links/types.ts).
  link jsonb not null check (jsonb_typeof(link) = 'object' and link ? 'kind'),
  sort_order integer not null default 0,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);

create index menu_items_menu_idx on public.menu_items (menu_id, parent_id, sort_order);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- One level of nesting, header only, parent in the same menu.
create function public.check_menu_item_nesting()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent record;
  menu_key text;
begin
  if new.parent_id is null then
    return new;
  end if;
  select m.key into menu_key from public.menus m where m.id = new.menu_id;
  if menu_key <> 'header' then
    raise exception 'Only the header menu can have dropdown items.' using errcode = '22023';
  end if;
  select i.menu_id, i.parent_id into parent from public.menu_items i where i.id = new.parent_id;
  if not found or parent.menu_id <> new.menu_id then
    raise exception 'A dropdown item must belong to an item in the same menu.' using errcode = '22023';
  end if;
  if parent.parent_id is not null then
    raise exception 'Menus allow only one level of dropdown items.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger menu_items_check_nesting
  before insert or update of parent_id, menu_id on public.menu_items
  for each row execute function public.check_menu_item_nesting();

-- ---------------------------------------------------------------------------------------------
-- contact_submissions (Phase 9 moves these into the CRM)
-- ---------------------------------------------------------------------------------------------

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages (id) on delete set null,
  name text not null,
  email extensions.citext not null,
  phone text,
  company text,
  message text not null,
  source_url text,
  status public.submission_status not null default 'new',
  created_at timestamptz not null default now()
);

create index contact_submissions_created_idx on public.contact_submissions (created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Media reference triggers
-- ---------------------------------------------------------------------------------------------

create function public.page_sections_media_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_media_references('page_sections', old.id::text, 'props', '{}');
    return old;
  end if;
  perform public.sync_media_references('page_sections', new.id::text, 'props', public.media_ids_in(new.props));
  return new;
end;
$$;

create trigger page_sections_media_refs
  after insert or update of props or delete on public.page_sections
  for each row execute function public.page_sections_media_refs();

create function public.pages_media_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_media_references('pages', old.id::text, 'og_image_media_id', '{}');
    perform public.sync_media_references('pages', old.id::text, 'published_sections', '{}');
    return old;
  end if;
  perform public.sync_media_references(
    'pages', new.id::text, 'og_image_media_id',
    case when new.og_image_media_id is null then '{}'::uuid[] else array[new.og_image_media_id] end
  );
  perform public.sync_media_references(
    'pages', new.id::text, 'published_sections', public.media_ids_in(new.published_sections)
  );
  return new;
end;
$$;

create trigger pages_media_refs
  after insert or update of og_image_media_id, published_sections or delete on public.pages
  for each row execute function public.pages_media_refs();

-- Editing a section marks its page as updated (for "last updated by and when").
create function public.touch_page_from_section()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pages p
  set updated_at = now()
  where p.id = coalesce(new.page_id, old.page_id);
  return null;
end;
$$;

create trigger page_sections_touch_page
  after insert or update or delete on public.page_sections
  for each row execute function public.touch_page_from_section();

revoke execute on function public.page_sections_media_refs() from public, anon, authenticated;
revoke execute on function public.pages_media_refs() from public, anon, authenticated;
revoke execute on function public.touch_page_from_section() from public, anon, authenticated;
revoke execute on function public.check_menu_item_nesting() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.pages enable row level security;

create policy "Anyone can read published pages"
  on public.pages for select
  to anon, authenticated
  using (status = 'published');

create policy "Content viewers can read all pages"
  on public.pages for select
  to authenticated
  using ((select public.can('content', 'view')));

create policy "Content creators can create pages"
  on public.pages for insert
  to authenticated
  with check (
    (select public.can('content', 'create'))
    and created_by = (select auth.uid())
    and status = 'draft'
    and not is_home
    and published_sections = '[]'::jsonb
  );

create policy "Content editors can edit pages"
  on public.pages for update
  to authenticated
  using ((select public.can('content', 'edit')))
  with check ((select public.can('content', 'edit')));

create policy "Content deleters can delete pages except the homepage"
  on public.pages for delete
  to authenticated
  using ((select public.can('content', 'delete')) and not is_home);

revoke truncate, references, trigger on public.pages from anon, authenticated;
revoke insert, update, delete on public.pages from anon;
revoke select on public.pages from anon;
grant select (
  id, title, slug, is_home, status, published_sections, published_at, seo_title,
  seo_description, og_image_media_id, updated_at
) on public.pages to anon;
-- Publishing columns (status, published_sections, published_at, is_home) change only through
-- the functions below.
revoke update on public.pages from authenticated;
grant update (title, slug, seo_title, seo_description, og_image_media_id) on public.pages to authenticated;

alter table public.page_sections enable row level security;

create policy "Content viewers can read draft sections"
  on public.page_sections for select
  to authenticated
  using ((select public.can('content', 'view')));

create policy "Content editors can add sections"
  on public.page_sections for insert
  to authenticated
  with check ((select public.can('content', 'edit')));

create policy "Content editors can edit sections"
  on public.page_sections for update
  to authenticated
  using ((select public.can('content', 'edit')))
  with check ((select public.can('content', 'edit')));

create policy "Content editors can delete sections"
  on public.page_sections for delete
  to authenticated
  using ((select public.can('content', 'edit')));

revoke all on public.page_sections from anon;
revoke truncate, references, trigger on public.page_sections from authenticated;
-- Order changes go through reorder_sections().
revoke update on public.page_sections from authenticated;
grant update (type, props, background, padding, anchor_id, is_hidden) on public.page_sections to authenticated;

alter table public.page_revisions enable row level security;

create policy "Content viewers can read revisions"
  on public.page_revisions for select
  to authenticated
  using ((select public.can('content', 'view')));

revoke all on public.page_revisions from anon;
revoke insert, update, delete, truncate, references, trigger on public.page_revisions from authenticated;

alter table public.menus enable row level security;

create policy "Anyone can read menus" on public.menus for select to anon, authenticated using (true);
create policy "Content editors can rename menus"
  on public.menus for update
  to authenticated
  using ((select public.can('content', 'edit')))
  with check ((select public.can('content', 'edit')));

revoke insert, delete, truncate, references, trigger on public.menus from anon, authenticated;
revoke update on public.menus from anon, authenticated;
grant update (title) on public.menus to authenticated;

alter table public.menu_items enable row level security;

create policy "Anyone can read menu items" on public.menu_items for select to anon, authenticated using (true);
create policy "Content editors can add menu items"
  on public.menu_items for insert to authenticated with check ((select public.can('content', 'edit')));
create policy "Content editors can edit menu items"
  on public.menu_items for update to authenticated
  using ((select public.can('content', 'edit'))) with check ((select public.can('content', 'edit')));
create policy "Content editors can delete menu items"
  on public.menu_items for delete to authenticated using ((select public.can('content', 'edit')));

revoke insert, update, delete, truncate, references, trigger on public.menu_items from anon;
revoke truncate, references, trigger on public.menu_items from authenticated;

alter table public.contact_submissions enable row level security;

create policy "Content viewers can read submissions"
  on public.contact_submissions for select
  to authenticated
  using ((select public.can('content', 'view')));

create policy "Content viewers can update submission status"
  on public.contact_submissions for update
  to authenticated
  using ((select public.can('content', 'view')))
  with check ((select public.can('content', 'view')));

revoke all on public.contact_submissions from anon;
revoke insert, update, delete, truncate, references, trigger on public.contact_submissions from authenticated;
grant update (status) on public.contact_submissions to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Draft snapshot: what publish_page would publish (non-hidden sections, in order)
-- ---------------------------------------------------------------------------------------------

create function public.page_draft_snapshot(page uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id, 'type', s.type, 'props', s.props, 'background', s.background,
        'padding', s.padding, 'anchor_id', s.anchor_id
      )
      order by s.sort_order
    ),
    '[]'::jsonb
  )
  from public.page_sections s
  where s.page_id = page and not s.is_hidden;
$$;

grant execute on function public.page_draft_snapshot(uuid) to authenticated;
revoke execute on function public.page_draft_snapshot(uuid) from public, anon;

-- ---------------------------------------------------------------------------------------------
-- Editing functions
-- ---------------------------------------------------------------------------------------------

create function public.reorder_sections(page uuid, ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing integer;
begin
  if not public.can('content', 'edit') then
    raise exception 'You don''t have permission to edit pages.' using errcode = '42501';
  end if;

  select count(*) into existing from public.page_sections s where s.page_id = page;
  if ordered_ids is null
    or cardinality(ordered_ids) <> existing
    or (select count(distinct id) from unnest(ordered_ids) as id) <> existing
    or exists (
      select 1 from unnest(ordered_ids) as id
      where not exists (select 1 from public.page_sections s where s.id = id and s.page_id = page)
    )
  then
    raise exception 'The new order must list every section of the page exactly once.' using errcode = '22023';
  end if;

  -- One statement; the unique (page_id, sort_order) constraint is checked at commit.
  update public.page_sections s
  set sort_order = o.position - 1
  from unnest(ordered_ids) with ordinality as o (id, position)
  where s.id = o.id and s.page_id = page;

  perform public.log_audit('page.sections_reordered', 'content', 'pages', page::text,
    jsonb_build_object('sections', cardinality(ordered_ids)));
end;
$$;

-- Shared by publish_page and seed tooling: assumes the caller was authorized.
create function public._publish_page(page uuid, actor uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not exists (select 1 from public.pages p where p.id = page) then
    raise exception 'Page % was not found.', page using errcode = 'P0002';
  end if;

  snapshot := public.page_draft_snapshot(page);

  update public.pages p
  set published_sections = snapshot, status = 'published', published_at = now(),
      updated_by = coalesce(actor, p.updated_by)
  where p.id = page;

  insert into public.page_revisions (page_id, sections, published_by) values (page, snapshot, actor);

  delete from public.page_revisions r
  where r.page_id = page
    and r.id not in (
      select r2.id from public.page_revisions r2 where r2.page_id = page
      order by r2.published_at desc, r2.id desc limit 20
    );

  return jsonb_array_length(snapshot);
end;
$$;

revoke execute on function public._publish_page(uuid, uuid) from public, anon, authenticated, service_role;

create function public.publish_page(page uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  published integer;
begin
  if not public.can('content', 'publish') then
    raise exception 'You don''t have permission to publish pages.' using errcode = '42501';
  end if;
  published := public._publish_page(page, auth.uid());
  perform public.log_audit('page.published', 'content', 'pages', page::text,
    jsonb_build_object('sections', published));
end;
$$;

/** For trusted tooling only (pnpm seed:media): publish without a signed-in user. */
create function public.system_publish_page(page uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  published integer;
begin
  published := public._publish_page(page, null);
  insert into public.audit_log (actor_id, action, scope, target_table, target_id, metadata)
  values (null, 'page.published', 'content', 'pages', page::text,
          jsonb_build_object('sections', published, 'by', 'system'));
end;
$$;

revoke execute on function public.system_publish_page(uuid) from public, anon, authenticated;
grant execute on function public.system_publish_page(uuid) to service_role;

create function public.unpublish_page(page uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  if not public.can('content', 'publish') then
    raise exception 'You don''t have permission to unpublish pages.' using errcode = '42501';
  end if;
  select p.is_home, p.status into target from public.pages p where p.id = page for update;
  if not found then
    raise exception 'Page % was not found.', page using errcode = 'P0002';
  end if;
  if target.is_home then
    raise exception 'The homepage cannot be unpublished. Set another page as the homepage first.'
      using errcode = '22023';
  end if;
  update public.pages p set status = 'draft', published_at = null where p.id = page;
  perform public.log_audit('page.unpublished', 'content', 'pages', page::text, '{}'::jsonb);
end;
$$;

-- Replaces the draft sections with a list of snapshot entries.
create function public._replace_draft_sections(page uuid, sections jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.page_sections s where s.page_id = page;
  insert into public.page_sections (id, page_id, type, sort_order, props, background, padding, anchor_id)
  select
    coalesce((e ->> 'id')::uuid, gen_random_uuid()),
    page,
    e ->> 'type',
    (o.position - 1)::integer,
    coalesce(e -> 'props', '{}'::jsonb),
    coalesce(e ->> 'background', 'white'),
    coalesce(e ->> 'padding', 'normal'),
    e ->> 'anchor_id'
  from jsonb_array_elements(coalesce(sections, '[]'::jsonb)) with ordinality as o (e, position);
  return jsonb_array_length(coalesce(sections, '[]'::jsonb));
end;
$$;

revoke execute on function public._replace_draft_sections(uuid, jsonb)
  from public, anon, authenticated, service_role;

create function public.restore_revision(revision uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rev record;
begin
  if not public.can('content', 'edit') then
    raise exception 'You don''t have permission to edit pages.' using errcode = '42501';
  end if;
  select r.page_id, r.sections, r.published_at into rev from public.page_revisions r where r.id = revision;
  if not found then
    raise exception 'Revision % was not found.', revision using errcode = 'P0002';
  end if;
  perform public._replace_draft_sections(rev.page_id, rev.sections);
  perform public.log_audit('page.revision_restored', 'content', 'pages', rev.page_id::text,
    jsonb_build_object('revision', revision, 'published_at', rev.published_at));
end;
$$;

create function public.discard_draft(page uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  if not public.can('content', 'edit') then
    raise exception 'You don''t have permission to edit pages.' using errcode = '42501';
  end if;
  select p.status, p.published_sections into target from public.pages p where p.id = page;
  if not found then
    raise exception 'Page % was not found.', page using errcode = 'P0002';
  end if;
  if target.status <> 'published' then
    raise exception 'This page has never been published, so there is nothing to go back to.'
      using errcode = '22023';
  end if;
  perform public._replace_draft_sections(page, target.published_sections);
  perform public.log_audit('page.draft_discarded', 'content', 'pages', page::text, '{}'::jsonb);
end;
$$;

create function public.set_home_page(page uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  previous uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can change the homepage.' using errcode = '42501';
  end if;
  select p.status, p.is_home into target from public.pages p where p.id = page for update;
  if not found then
    raise exception 'Page % was not found.', page using errcode = 'P0002';
  end if;
  if target.status <> 'published' then
    raise exception 'Publish the page before making it the homepage.' using errcode = '22023';
  end if;
  if target.is_home then
    return;
  end if;
  select p.id into previous from public.pages p where p.is_home;
  update public.pages p set is_home = false where p.is_home;
  update public.pages p set is_home = true where p.id = page;
  perform public.log_audit('page.set_as_home', 'content', 'pages', page::text,
    jsonb_build_object('previous', previous));
end;
$$;

revoke execute on function public.reorder_sections(uuid, uuid[]) from public, anon;
revoke execute on function public.publish_page(uuid) from public, anon;
revoke execute on function public.unpublish_page(uuid) from public, anon;
revoke execute on function public.restore_revision(uuid) from public, anon;
revoke execute on function public.discard_draft(uuid) from public, anon;
revoke execute on function public.set_home_page(uuid) from public, anon;
grant execute on function public.reorder_sections(uuid, uuid[]) to authenticated;
grant execute on function public.publish_page(uuid) to authenticated;
grant execute on function public.unpublish_page(uuid) to authenticated;
grant execute on function public.restore_revision(uuid) to authenticated;
grant execute on function public.discard_draft(uuid) to authenticated;
grant execute on function public.set_home_page(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Contact form
-- ---------------------------------------------------------------------------------------------

create function public.submit_contact_form(
  page_id uuid,
  name text,
  email text,
  message text,
  phone text default null,
  company text default null,
  source_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission uuid;
  clean_name text := trim(coalesce(submit_contact_form.name, ''));
  clean_email text := lower(trim(coalesce(submit_contact_form.email, '')));
  clean_message text := trim(coalesce(submit_contact_form.message, ''));
  clean_phone text := nullif(trim(coalesce(submit_contact_form.phone, '')), '');
  clean_company text := nullif(trim(coalesce(submit_contact_form.company, '')), '');
begin
  if not exists (
    select 1 from public.pages p
    where p.id = submit_contact_form.page_id
      and p.status = 'published'
      and exists (
        select 1 from jsonb_array_elements(p.published_sections) s where s ->> 'type' = 'contact_form'
      )
  ) then
    raise exception 'This page does not accept messages.' using errcode = '22023';
  end if;

  if length(clean_name) not between 1 and 100 then
    raise exception 'Name must be between 1 and 100 characters.' using errcode = '22023';
  end if;
  if length(clean_email) > 254 or clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if length(clean_message) not between 1 and 5000 then
    raise exception 'Message must be between 1 and 5000 characters.' using errcode = '22023';
  end if;
  if length(coalesce(clean_phone, '')) > 40 or length(coalesce(clean_company, '')) > 120
    or length(coalesce(submit_contact_form.source_url, '')) > 500 then
    raise exception 'One of the fields is too long.' using errcode = '22023';
  end if;

  insert into public.contact_submissions (page_id, name, email, phone, company, message, source_url)
  values (submit_contact_form.page_id, clean_name, clean_email, clean_phone, clean_company,
          clean_message, left(submit_contact_form.source_url, 500))
  returning id into submission;

  insert into public.audit_log (actor_id, action, scope, target_table, target_id, metadata)
  values (auth.uid(), 'contact.submitted', 'content', 'contact_submissions', submission::text,
          jsonb_build_object('page_id', submit_contact_form.page_id));

  return submission;
end;
$$;

revoke execute on function public.submit_contact_form(uuid, text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_form(uuid, text, text, text, text, text, text)
  to anon, authenticated;
