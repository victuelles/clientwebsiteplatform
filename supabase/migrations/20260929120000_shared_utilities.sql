-- Shared database utilities used by every later migration.
--
-- Convention for every function in this project: `set search_path = ''` and fully qualified names
-- (public.profiles, auth.uid(), extensions.citext). This prevents search_path hijacking, which
-- matters most for security definer functions.

-- Keeps updated_at current. Attach with:
--   create trigger <table>_set_updated_at before update on public.<table>
--     for each row execute function public.set_updated_at();
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'Trigger: sets updated_at to now() on update.';

-- super_admin: exactly one per deployment. staff: permission-based access. user: own records only.
create type public.app_role as enum ('super_admin', 'staff', 'user');

create type public.permission_action as enum ('view', 'create', 'edit', 'delete', 'publish');
