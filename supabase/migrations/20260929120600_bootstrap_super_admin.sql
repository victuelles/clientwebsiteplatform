-- Super admin bootstrap. Called by the app (admin client, service_role) when a user whose email
-- matches SUPER_ADMIN_EMAIL signs in. Re-checks every condition in the database:
--   * no super admin exists yet
--   * the email matches expected_email (case-insensitive)
--   * the email is confirmed
--   * the account is active
-- The partial unique index on profiles makes concurrent bootstraps safe: the loser gets a
-- unique violation and returns false. Never demotes anyone.

create function public.bootstrap_super_admin(target_user uuid, expected_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  if exists (select 1 from public.profiles p where p.role = 'super_admin') then
    return false;
  end if;

  select u.email, u.email_confirmed_at, p.is_active
  into target
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = target_user;

  if not found
    or target.email_confirmed_at is null
    or not target.is_active
    or lower(target.email) is distinct from lower(trim(expected_email))
  then
    return false;
  end if;

  update public.profiles
  set role = 'super_admin'
  where id = target_user;

  -- No auth.uid() here (service_role call), so write the audit row directly.
  insert into public.audit_log (actor_id, action, scope, target_table, target_id, metadata)
  values (
    target_user,
    'user.super_admin_bootstrapped',
    'users',
    'profiles',
    target_user::text,
    jsonb_build_object('email', target.email)
  );

  return true;
exception
  when unique_violation then
    return false;
end;
$$;

comment on function public.bootstrap_super_admin(uuid, text) is
  'Promotes the first confirmed SUPER_ADMIN_EMAIL account to super_admin. service_role only.';

revoke execute on function public.bootstrap_super_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.bootstrap_super_admin(uuid, text) to service_role;
