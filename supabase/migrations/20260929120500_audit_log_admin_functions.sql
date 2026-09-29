-- Audit log and the admin functions that change roles, active status, and modules.
--
-- Nobody writes to audit_log directly (not even service_role); rows are only added by security
-- definer functions.

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  scope text,
  target_table text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Append-only log of privileged actions.';
comment on column public.audit_log.actor_id is
  'auth.uid() of the actor. No foreign key so entries survive user deletion.';

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_actor_id_idx on public.audit_log (actor_id);

alter table public.audit_log enable row level security;

create policy "Super admin can read the audit log"
  on public.audit_log for select
  to authenticated
  using ((select public.is_super_admin()));

revoke insert, update, delete, truncate, references, trigger on public.audit_log
  from anon, authenticated, service_role;
revoke select on public.audit_log from anon;

-- ---------------------------------------------------------------------------------------------
-- log_audit: records an action by the signed-in user.
-- ---------------------------------------------------------------------------------------------

create function public.log_audit(
  action text,
  scope text default null,
  target_table text default null,
  target_id text default null,
  metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'log_audit requires a signed-in user.'
      using errcode = '42501';
  end if;

  if coalesce(trim(log_audit.action), '') = '' then
    raise exception 'log_audit requires an action.'
      using errcode = '22023';
  end if;

  insert into public.audit_log (actor_id, action, scope, target_table, target_id, metadata)
  values (
    auth.uid(),
    log_audit.action,
    log_audit.scope,
    log_audit.target_table,
    log_audit.target_id,
    coalesce(log_audit.metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.log_audit(text, text, text, text, jsonb) from public, anon;
grant execute on function public.log_audit(text, text, text, text, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- set_user_role: super admin changes a user's role between 'staff' and 'user'.
-- ---------------------------------------------------------------------------------------------

create function public.set_user_role(target_user uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role public.app_role;
  revoked_count integer := 0;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can change user roles.'
      using errcode = '42501';
  end if;

  if new_role is null then
    raise exception 'A new role is required.'
      using errcode = '22023';
  end if;

  if new_role = 'super_admin' then
    raise exception 'The super_admin role cannot be assigned. There is exactly one super admin, created by bootstrap.'
      using errcode = '22023';
  end if;

  select p.role into old_role
  from public.profiles p
  where p.id = target_user
  for update;

  if not found then
    raise exception 'User % was not found.', target_user
      using errcode = 'P0002';
  end if;

  if old_role = 'super_admin' then
    raise exception 'The super admin''s role cannot be changed.'
      using errcode = '42501';
  end if;

  if old_role = new_role then
    return;
  end if;

  update public.profiles
  set role = new_role
  where id = target_user;

  -- A user who is no longer staff keeps no stale grants.
  if new_role <> 'staff' then
    delete from public.staff_permissions sp where sp.user_id = target_user;
    get diagnostics revoked_count = row_count;
  end if;

  perform public.log_audit(
    'user.role_changed',
    'users',
    'profiles',
    target_user::text,
    jsonb_build_object('from', old_role, 'to', new_role, 'permissions_revoked', revoked_count)
  );
end;
$$;

revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- set_user_active: super admin activates or deactivates a user.
-- ---------------------------------------------------------------------------------------------

create function public.set_user_active(target_user uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
  was_active boolean;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can activate or deactivate users.'
      using errcode = '42501';
  end if;

  if active is null then
    raise exception 'active must be true or false.'
      using errcode = '22023';
  end if;

  select p.role, p.is_active into target_role, was_active
  from public.profiles p
  where p.id = target_user
  for update;

  if not found then
    raise exception 'User % was not found.', target_user
      using errcode = 'P0002';
  end if;

  if target_role = 'super_admin' then
    raise exception 'The super admin cannot be deactivated.'
      using errcode = '42501';
  end if;

  if was_active = set_user_active.active then
    return;
  end if;

  update public.profiles
  set is_active = set_user_active.active
  where id = target_user;

  perform public.log_audit(
    case when set_user_active.active then 'user.activated' else 'user.deactivated' end,
    'users',
    'profiles',
    target_user::text,
    '{}'::jsonb
  );
end;
$$;

revoke execute on function public.set_user_active(uuid, boolean) from public, anon;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- set_module_enabled: super admin turns a module on or off. Never deletes module data.
-- ---------------------------------------------------------------------------------------------

create function public.set_module_enabled(module_key text, enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_enabled boolean;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can enable or disable modules.'
      using errcode = '42501';
  end if;

  if set_module_enabled.enabled is null then
    raise exception 'enabled must be true or false.'
      using errcode = '22023';
  end if;

  select m.enabled into was_enabled
  from public.modules m
  where m.key = module_key
  for update;

  if not found then
    raise exception 'Unknown module "%".', module_key
      using errcode = 'P0002';
  end if;

  if was_enabled = set_module_enabled.enabled then
    return;
  end if;

  update public.modules m
  set enabled = set_module_enabled.enabled,
      updated_by = auth.uid()
  where m.key = module_key;

  perform public.log_audit(
    case when set_module_enabled.enabled then 'module.enabled' else 'module.disabled' end,
    module_key,
    'modules',
    module_key,
    '{}'::jsonb
  );
end;
$$;

revoke execute on function public.set_module_enabled(text, boolean) from public, anon;
grant execute on function public.set_module_enabled(text, boolean) to authenticated;
