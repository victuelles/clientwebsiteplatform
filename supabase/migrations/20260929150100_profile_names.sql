-- Display names for "last updated by" in the content admin. Staff can read only their own
-- profile row, so this returns just id + name (never email, role, or status) to anyone with
-- content view.

create function public.profile_names(ids uuid[])
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), split_part(p.email::text, '@', 1))
  from public.profiles p
  where p.id = any (ids)
    and public.can('content', 'view');
$$;

revoke execute on function public.profile_names(uuid[]) from public, anon;
grant execute on function public.profile_names(uuid[]) to authenticated;
