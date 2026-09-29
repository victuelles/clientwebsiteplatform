-- Site settings, permission scopes, and modules.
--
-- The seed rows here belong in a migration (not seed.sql) because every client database needs
-- them.

-- Sets updated_by to the acting user when there is one (migrations and service tasks keep the
-- value they were given).
create function public.set_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

comment on function public.set_updated_by() is 'Trigger: sets updated_by to auth.uid() on update.';

-- ---------------------------------------------------------------------------------------------
-- site_settings: exactly one row. Phase 3 adds branding columns.
-- ---------------------------------------------------------------------------------------------

create table public.site_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'My Site',
  contact_email text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.site_settings is 'Single-row table of per-client site settings.';

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_by
  before update on public.site_settings
  for each row execute function public.set_updated_by();

insert into public.site_settings (id) values (true);

alter table public.site_settings enable row level security;

create policy "Anyone can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "Super admin can update site settings"
  on public.site_settings for update
  to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

revoke insert, delete, truncate, references, trigger on public.site_settings
  from anon, authenticated;
revoke update on public.site_settings from anon;

-- ---------------------------------------------------------------------------------------------
-- permission_scopes: the areas a staff permission can apply to. Core scopes are always on;
-- module scopes follow public.modules.enabled.
-- ---------------------------------------------------------------------------------------------

create table public.permission_scopes (
  key text primary key,
  label text not null,
  kind text not null check (kind in ('core', 'module')),
  sort_order integer not null default 0
);

comment on table public.permission_scopes is
  'Areas a staff permission can apply to. Changed only through migrations.';

insert into public.permission_scopes (key, label, kind, sort_order) values
  ('content',         'Homepage and pages', 'core',   10),
  ('media',           'Media library',      'core',   20),
  ('blog',            'Blog',               'module', 100),
  ('photo_gallery',   'Photo gallery',      'module', 110),
  ('video_gallery',   'Video gallery',      'module', 120),
  ('shop',            'Shop',               'module', 130),
  ('directory',       'Business directory', 'module', 140),
  ('inventory',       'Inventory',          'module', 150),
  ('crm',             'CRM',                'module', 160),
  ('booking',         'Booking',            'module', 170),
  ('email_marketing', 'Email marketing',    'module', 180);

alter table public.permission_scopes enable row level security;

create policy "Signed-in users can read permission scopes"
  on public.permission_scopes for select
  to authenticated
  using (true);

revoke insert, update, delete, truncate, references, trigger on public.permission_scopes
  from anon, authenticated;
revoke select on public.permission_scopes from anon;

-- ---------------------------------------------------------------------------------------------
-- modules: on/off switch per optional module. Disabling hides UI and blocks new operations but
-- never deletes data.
-- ---------------------------------------------------------------------------------------------

create table public.modules (
  key text primary key references public.permission_scopes (key),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.modules is 'Which optional modules are enabled for this deployment.';

create trigger modules_set_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

create trigger modules_set_updated_by
  before update on public.modules
  for each row execute function public.set_updated_by();

insert into public.modules (key)
select key from public.permission_scopes where kind = 'module';

alter table public.modules enable row level security;

-- The public site needs to know which modules are enabled.
create policy "Anyone can read modules"
  on public.modules for select
  to anon, authenticated
  using (true);

create policy "Super admin can update modules"
  on public.modules for update
  to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

revoke insert, delete, truncate, references, trigger on public.modules from anon, authenticated;
revoke update on public.modules from anon;
