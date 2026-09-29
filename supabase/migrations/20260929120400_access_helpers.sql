-- =============================================================================================
-- Access helper functions
-- =============================================================================================
--
-- Every RLS policy written from now on combines up to three checks:
--
--   1. Module status       Is the module (scope) enabled?
--                          public.module_enabled('<scope>'), or implicitly through public.can().
--                          Core scopes ('content', 'media') are always enabled.
--
--   2. Role permission     May this person perform this action on this scope?
--                          public.has_permission('<scope>', '<action>'), or public.can().
--                          The super admin always may; active staff need a staff_permissions
--                          row; users and visitors never have admin permissions.
--
--   3. Record ownership    Does the row belong to the signed-in user?
--                          <table>.user_id = (select auth.uid())
--                          Every user-owned table has an owner column named user_id that
--                          references public.profiles(id).
--
-- public.can(scope, action) = module_enabled(scope) and has_permission(scope, action). Use it
-- for staff/admin writes. Use module_enabled() alone for public reads of published content.
--
-- Always wrap helper calls in a scalar subquery, e.g. (select public.can('shop', 'edit')), so
-- Postgres evaluates them once per statement instead of once per row.
--
-- Also defined earlier, in the profiles migration:
--   public.current_app_role()  role of the signed-in user, or null if signed out or inactive
--   public.is_super_admin()    true for the active super admin
--
-- Example: a future user-owned table such as public.orders (shop module)
--
--   alter table public.orders enable row level security;
--
--   -- Customers read their own orders, but only while the shop module is enabled.
--   create policy "Customers can read their own orders"
--     on public.orders for select
--     to authenticated
--     using (
--       user_id = (select auth.uid())
--       and (select public.module_enabled('shop'))
--     );
--
--   -- Staff with shop:view (and the super admin) read every order.
--   create policy "Staff can read orders"
--     on public.orders for select
--     to authenticated
--     using ((select public.can('shop', 'view')));
--
--   -- Staff with shop:edit update orders.
--   create policy "Staff can update orders"
--     on public.orders for update
--     to authenticated
--     using ((select public.can('shop', 'edit')))
--     with check ((select public.can('shop', 'edit')));
--
-- =============================================================================================

-- True for the active super admin or active staff.
create function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('super_admin', 'staff'), false);
$$;

-- True for core scopes; for module scopes, whether the module is enabled. Unknown scopes: false.
create function public.module_enabled(scope_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case s.kind when 'core' then true else coalesce(m.enabled, false) end
      from public.permission_scopes s
      left join public.modules m on m.key = s.key
      where s.key = scope_key
    ),
    false
  );
$$;

-- True for the super admin; for active staff, whether a matching grant exists; otherwise false.
-- Does not look at module status (see can()).
create function public.has_permission(scope_key text, act public.permission_action)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_app_role()
    when 'super_admin' then true
    when 'staff' then exists (
      select 1
      from public.staff_permissions sp
      where sp.user_id = auth.uid()
        and sp.scope = scope_key
        and sp.action = act
    )
    else false
  end;
$$;

-- Module enabled AND permission granted. The check future module policies use for staff writes.
create function public.can(scope_key text, act public.permission_action)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.module_enabled(scope_key) and public.has_permission(scope_key, act);
$$;

comment on function public.is_staff_or_admin() is 'True for active staff or the super admin.';
comment on function public.module_enabled(text) is 'True for core scopes and enabled modules.';
comment on function public.has_permission(text, public.permission_action) is
  'True for the super admin, or active staff holding the grant.';
comment on function public.can(text, public.permission_action) is
  'module_enabled(scope) and has_permission(scope, action).';

revoke execute on function public.is_staff_or_admin() from public;
revoke execute on function public.module_enabled(text) from public;
revoke execute on function public.has_permission(text, public.permission_action) from public;
revoke execute on function public.can(text, public.permission_action) from public;

grant execute on function public.is_staff_or_admin() to anon, authenticated, service_role;
grant execute on function public.module_enabled(text) to anon, authenticated, service_role;
grant execute on function public.has_permission(text, public.permission_action)
  to anon, authenticated, service_role;
grant execute on function public.can(text, public.permission_action)
  to anon, authenticated, service_role;
