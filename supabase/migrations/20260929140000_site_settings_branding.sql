-- Phase 3: branding, contact, header/footer, and SEO settings on the single site_settings row.
-- Brand asset foreign keys to media_assets are added in the media migration (ordering).

alter table public.site_settings
  add column tagline text,
  add column description text,
  add column phone text,
  add column location_label text,
  add column address text,
  add column map_url text,
  add column social_links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(social_links) = 'array'),
  add column logo_media_id uuid,
  add column logo_on_dark_media_id uuid,
  add column favicon_media_id uuid,
  add column og_image_media_id uuid,
  -- Shape: src/core/settings/theme.ts (versioned Zod schema). Validated by the app.
  add column theme jsonb not null default '{}'::jsonb
    check (jsonb_typeof(theme) = 'object'),
  add column show_top_bar boolean not null default true,
  add column header_cta_label text,
  add column header_cta_href text,
  -- "{year}" is replaced with the current year when rendered.
  add column footer_copyright text,
  add column privacy_href text,
  add column terms_href text,
  add column seo_title_template text,
  -- Falls back to description when null.
  add column seo_description text,
  -- New client sites stay out of search engines until launch.
  add column allow_indexing boolean not null default false,
  add constraint site_settings_site_name_not_blank check (length(trim(site_name)) > 0);

comment on column public.site_settings.theme is
  'Versioned theme (colors, fonts, radius). Shape defined by src/core/settings/theme.ts.';

-- North / Co placeholder values from docs/design.
update public.site_settings
set
  site_name = 'North / Co',
  tagline = 'A different kind of partner',
  description = 'Thoughtful strategy and meaningful work, built around the people and organizations we serve.',
  contact_email = 'hello@yourcompany.com',
  phone = '+1 (650) 410-7800',
  location_label = 'San Francisco Bay Area, CA',
  social_links = '[
    {"platform": "email", "url": "mailto:hello@yourcompany.com"},
    {"platform": "phone", "url": "tel:+16504107800"}
  ]'::jsonb,
  theme = '{
    "version": 1,
    "colors": {
      "accent": "#ed573d",
      "navy": "#0a102a",
      "background": "#ffffff",
      "foreground": "#121729",
      "muted": "#fafafa",
      "mutedForeground": "#5f6471",
      "border": "#e9eaed"
    },
    "fonts": {"heading": "inter", "body": "inter"},
    "radius": 0.125
  }'::jsonb,
  show_top_bar = true,
  header_cta_label = 'Let''s talk',
  header_cta_href = '/contact',
  footer_copyright = '© {year} North & Co. All rights reserved.',
  privacy_href = '/privacy',
  terms_href = '/terms',
  seo_title_template = '%s | North / Co',
  allow_indexing = false
where id;

-- ---------------------------------------------------------------------------------------------
-- update_site_settings: the only way the app changes settings. Super admin only; keys are
-- checked against an allow-list; one audit entry lists the fields that actually changed.
-- ---------------------------------------------------------------------------------------------

create function public.update_site_settings(changes jsonb)
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
  unknown_key text;
  current_row public.site_settings;
  next_row public.site_settings;
  changed text[];
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

comment on function public.update_site_settings(jsonb) is
  'Super admin only: applies allow-listed setting changes and audits the changed fields.';

revoke execute on function public.update_site_settings(jsonb) from public, anon;
grant execute on function public.update_site_settings(jsonb) to authenticated;
