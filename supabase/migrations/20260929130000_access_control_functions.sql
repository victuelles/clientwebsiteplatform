-- Phase 2: functions behind the app-side access guard and staff management.

-- ---------------------------------------------------------------------------------------------
-- get_my_permissions: the caller's effective permissions.
--   super admin -> every (scope, action)
--   active staff -> their staff_permissions rows
--   anyone else -> nothing
-- Module status is NOT applied here; the app combines this with public.modules (see can()).
-- ---------------------------------------------------------------------------------------------

create function public.get_my_permissions()
returns table (scope text, action public.permission_action)
language sql
stable
security definer
set search_path = ''
as $$
  select s.key, a.action
  from public.permission_scopes s
  cross join unnest(enum_range(null::public.permission_action)) as a (action)
  where public.is_super_admin()
  union all
  select sp.scope, sp.action
  from public.staff_permissions sp
  where sp.user_id = auth.uid()
    and public.current_app_role() = 'staff';
$$;

comment on function public.get_my_permissions() is
  'Effective (scope, action) permissions of the caller. Ignores module status.';

revoke execute on function public.get_my_permissions() from public;
grant execute on function public.get_my_permissions() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- set_staff_permissions: atomically replace a staff member's grants with the given set.
--   permissions: jsonb array of {"scope": "...", "action": "..."} (duplicates are ignored)
-- Writes one audit entry with the added and removed grants (none when nothing changed).
-- ---------------------------------------------------------------------------------------------

create function public.set_staff_permissions(target_user uuid, permissions jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
  item jsonb;
  bad_scope text;
  bad_action text;
  desired jsonb;
  added jsonb;
  removed jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can change staff permissions.'
      using errcode = '42501';
  end if;

  if permissions is null or jsonb_typeof(permissions) <> 'array' then
    raise exception 'permissions must be a JSON array of {"scope", "action"} objects.'
      using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(permissions) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item -> 'scope') is distinct from 'string'
      or jsonb_typeof(item -> 'action') is distinct from 'string'
    then
      raise exception 'Each permission must be an object with string "scope" and "action".'
        using errcode = '22023';
    end if;
  end loop;

  select p ->> 'scope' into bad_scope
  from jsonb_array_elements(permissions) p
  where not exists (select 1 from public.permission_scopes s where s.key = p ->> 'scope')
  limit 1;
  if bad_scope is not null then
    raise exception 'Unknown permission scope "%".', bad_scope
      using errcode = '22023';
  end if;

  select p ->> 'action' into bad_action
  from jsonb_array_elements(permissions) p
  where not (p ->> 'action' = any (enum_range(null::public.permission_action)::text[]))
  limit 1;
  if bad_action is not null then
    raise exception 'Unknown permission action "%".', bad_action
      using errcode = '22023';
  end if;

  select pr.role into target_role
  from public.profiles pr
  where pr.id = target_user
  for update;

  if not found then
    raise exception 'User % was not found.', target_user
      using errcode = 'P0002';
  end if;

  if target_role <> 'staff' then
    raise exception 'Permissions can only be granted to staff members.'
      using errcode = '22023';
  end if;

  -- Normalised, de-duplicated target set.
  select coalesce(jsonb_agg(distinct jsonb_build_object('scope', p ->> 'scope', 'action', p ->> 'action')),
                  '[]'::jsonb)
  into desired
  from jsonb_array_elements(permissions) p;

  select coalesce(jsonb_agg(jsonb_build_object('scope', d.scope, 'action', d.action)
                            order by d.scope, d.action), '[]'::jsonb)
  into added
  from jsonb_to_recordset(desired) as d (scope text, action public.permission_action)
  where not exists (
    select 1 from public.staff_permissions sp
    where sp.user_id = target_user and sp.scope = d.scope and sp.action = d.action
  );

  select coalesce(jsonb_agg(jsonb_build_object('scope', sp.scope, 'action', sp.action)
                            order by sp.scope, sp.action), '[]'::jsonb)
  into removed
  from public.staff_permissions sp
  where sp.user_id = target_user
    and not exists (select 1 from jsonb_to_recordset(desired) as d (scope text, action public.permission_action) where d.scope = sp.scope and d.action = sp.action);

  delete from public.staff_permissions sp
  where sp.user_id = target_user
    and not exists (select 1 from jsonb_to_recordset(desired) as d (scope text, action public.permission_action) where d.scope = sp.scope and d.action = sp.action);

  insert into public.staff_permissions (user_id, scope, action, granted_by)
  select target_user, d.scope, d.action, auth.uid()
  from jsonb_to_recordset(desired) as d (scope text, action public.permission_action)
  on conflict (user_id, scope, action) do nothing;

  if jsonb_array_length(added) > 0 or jsonb_array_length(removed) > 0 then
    perform public.log_audit(
      'staff.permissions_updated',
      'users',
      'profiles',
      target_user::text,
      jsonb_build_object('added', added, 'removed', removed)
    );
  end if;
end;
$$;

comment on function public.set_staff_permissions(uuid, jsonb) is
  'Super admin only: replaces a staff member''s grants atomically and audits the difference.';

revoke execute on function public.set_staff_permissions(uuid, jsonb) from public, anon;
grant execute on function public.set_staff_permissions(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- set_user_role: unchanged behaviour, restated here so the rule is explicit: moving a staff
-- member to any other role deletes all of their staff_permissions in the same transaction
-- (already true since Phase 1; covered by pgTAP tests).
-- ---------------------------------------------------------------------------------------------

comment on function public.set_user_role(uuid, public.app_role) is
  'Super admin only: switches a user between staff and user. Leaving staff deletes all grants.';

-- ---------------------------------------------------------------------------------------------
-- admin_list_staff: staff members with auth details the profiles table does not have (invite
-- state, last sign-in) and their grant counts. Super admin only. Pass target_user for one row.
-- ---------------------------------------------------------------------------------------------

create function public.admin_list_staff(target_user uuid default null)
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  is_active boolean,
  invited_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  permission_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can list staff.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.email::text,
    p.full_name,
    p.avatar_url,
    p.is_active,
    u.invited_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    p.created_at,
    (select count(*)::integer from public.staff_permissions sp where sp.user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'staff'
    and (target_user is null or p.id = target_user)
  order by lower(coalesce(p.full_name, p.email::text));
end;
$$;

comment on function public.admin_list_staff(uuid) is
  'Super admin only: staff members with invite state, last sign-in, and grant count.';

revoke execute on function public.admin_list_staff(uuid) from public, anon;
grant execute on function public.admin_list_staff(uuid) to authenticated;
