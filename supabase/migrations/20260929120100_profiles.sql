-- Profiles: one row per auth user, holding the app role and active flag.
--
-- Roles are read from this table on every request (never from JWT claims), so a role change or
-- deactivation takes effect immediately.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null unique,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'App profile for each auth user: role and active flag.';

-- There can only ever be one super admin.
create unique index profiles_single_super_admin
  on public.profiles (role)
  where role = 'super_admin';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Sync from auth.users
-- ---------------------------------------------------------------------------------------------

-- Every new auth user gets a profile with role 'user'. full_name comes from sign-up metadata.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep profiles.email in sync when a user changes their email.
create function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_change();

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_auth_user_email_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Role helpers
--
-- Defined here, not in the access-helpers migration, because the profiles policies below need
-- is_super_admin(). The remaining helpers (is_staff_or_admin, module_enabled, has_permission,
-- can) live in the access-helpers migration, which documents all of them.
--
-- security definer: they read profiles as the table owner, so calling them from a profiles
-- policy does not recurse into RLS.
-- ---------------------------------------------------------------------------------------------

-- Role of the signed-in user, or null if signed out, missing, or inactive.
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active;
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'super_admin', false);
$$;

revoke execute on function public.current_app_role() from public;
revoke execute on function public.is_super_admin() from public;
grant execute on function public.current_app_role() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Own profile, even when inactive, so the app can detect a disabled account and sign it out.
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Super admin can read all profiles"
  on public.profiles for select
  to authenticated
  using ((select public.is_super_admin()));

-- TODO(phase-2): let staff read other profiles when they hold 'view' on a scope that needs it
-- (for example CRM contacts or booking customers). Until then staff read only their own row,
-- through the policy above.

-- Active users may update their own row. Column grants below limit this to full_name and
-- avatar_url, so role, email, and is_active can never be changed through the API.
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and (select public.current_app_role()) is not null)
  with check (id = (select auth.uid()));

-- No insert or delete policies: the auth trigger creates rows, the auth.users cascade deletes
-- them, and admin functions change role and is_active.

revoke insert, update, delete, truncate, references, trigger on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
