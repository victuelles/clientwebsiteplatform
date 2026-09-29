-- staff_permissions RLS and the access helpers (current_app_role, is_super_admin,
-- is_staff_or_admin, module_enabled, has_permission, can) for every role.
begin;
\ir ../helpers.psql
select plan(41);

select tests.create_user('c0000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('c0000000-0000-4000-8000-000000000002', 'staff1@t.test', 'staff');
select tests.create_user('c0000000-0000-4000-8000-000000000003', 'staff2@t.test', 'staff');
select tests.create_user('c0000000-0000-4000-8000-000000000004', 'user@t.test', 'user');

insert into public.staff_permissions (user_id, scope, action, granted_by) values
  ('c0000000-0000-4000-8000-000000000002', 'content', 'view', 'c0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'blog', 'edit', 'c0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', 'media', 'view', 'c0000000-0000-4000-8000-000000000001');
-- A user who still has a stray grant (e.g. inserted by hand) must not see or use it.
insert into public.staff_permissions (user_id, scope, action)
values ('c0000000-0000-4000-8000-000000000004', 'content', 'view');
select set_config('tests.total_grants', (select count(*) from public.staff_permissions)::text, true);

-- staff_permissions visibility ------------------------------------------------------------------
select tests.claims_for('c0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.staff_permissions), 2, 'staff see their own grants');
select is(
  (select count(*)::int from public.staff_permissions where user_id <> 'c0000000-0000-4000-8000-000000000002'),
  0, 'staff see no other grants'
);
select throws_ok(
  $$ insert into public.staff_permissions (user_id, scope, action, granted_by)
     values ('c0000000-0000-4000-8000-000000000002', 'content', 'delete', 'c0000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'staff cannot grant permissions'
);
select throws_ok(
  $$ update public.staff_permissions set action = 'delete' $$,
  '42501', null, 'nobody can update a grant'
);
reset role;

select tests.claims_for('c0000000-0000-4000-8000-000000000004');
set local role authenticated;
select is((select count(*)::int from public.staff_permissions), 0, 'users see no grants, not even their own');
reset role;

select tests.clear_claims();
set local role anon;
select is((select count(*)::int from public.staff_permissions), 0, 'anon sees no grants');
reset role;

select tests.claims_for('c0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(
  (select count(*) from public.staff_permissions)::text,
  current_setting('tests.total_grants'),
  'the super admin sees every grant'
);
select lives_ok(
  $$ insert into public.staff_permissions (user_id, scope, action, granted_by)
     values ('c0000000-0000-4000-8000-000000000003', 'content', 'edit', 'c0000000-0000-4000-8000-000000000001') $$,
  'the super admin can grant permissions'
);
select throws_ok(
  $$ insert into public.staff_permissions (user_id, scope, action, granted_by)
     values ('c0000000-0000-4000-8000-000000000003', 'content', 'delete', 'c0000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'granted_by must be the super admin'
);
select lives_ok(
  $$ delete from public.staff_permissions
     where user_id = 'c0000000-0000-4000-8000-000000000003' and scope = 'content' $$,
  'the super admin can revoke permissions'
);
select throws_ok(
  $$ update public.staff_permissions set action = 'delete' $$,
  '42501', null, 'even the super admin cannot update a grant'
);
reset role;

-- Helpers: anon --------------------------------------------------------------------------------
select tests.clear_claims();
set local role anon;
select is(public.current_app_role(), null, 'anon: no role');
select is(public.is_super_admin(), false, 'anon: not super admin');
select is(public.is_staff_or_admin(), false, 'anon: not staff');
select is(public.module_enabled('content'), true, 'core scopes are always enabled');
select is(public.module_enabled('blog'), false, 'modules start disabled');
select is(public.module_enabled('no_such_scope'), false, 'unknown scopes are not enabled');
select is(public.has_permission('content', 'view'), false, 'anon: no permissions');
select is(public.can('content', 'view'), false, 'anon: can nothing');
reset role;

-- Helpers: user --------------------------------------------------------------------------------
select tests.claims_for('c0000000-0000-4000-8000-000000000004');
set local role authenticated;
select is(public.current_app_role(), 'user'::public.app_role, 'user: role user');
select is(public.is_staff_or_admin(), false, 'user: not staff');
select is(public.has_permission('content', 'view'), false, 'user: a stray grant gives no permission');
select is(public.can('content', 'view'), false, 'user: can nothing');
reset role;

-- Helpers: staff ---------------------------------------------------------------------------------
select tests.claims_for('c0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is(public.current_app_role(), 'staff'::public.app_role, 'staff: role staff');
select is(public.is_staff_or_admin(), true, 'staff: is staff');
select is(public.is_super_admin(), false, 'staff: not super admin');
select is(public.has_permission('content', 'view'), true, 'staff: has a granted core permission');
select is(public.has_permission('content', 'edit'), false, 'staff: lacks an ungranted action');
select is(public.can('content', 'view'), true, 'staff: can use a granted core permission');
select is(public.has_permission('blog', 'edit'), true, 'staff: holds blog:edit');
select is(public.can('blog', 'edit'), false, 'staff: cannot use it while the blog module is disabled');
reset role;

update public.modules set enabled = true where key = 'blog';

select tests.claims_for('c0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is(public.can('blog', 'edit'), true, 'staff: can use blog:edit once the module is enabled');
reset role;

-- Helpers: inactive staff ------------------------------------------------------------------------
update public.profiles set is_active = false where id = 'c0000000-0000-4000-8000-000000000002';
select tests.claims_for('c0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is(public.current_app_role(), null, 'inactive staff: no role');
select is(public.is_staff_or_admin(), false, 'inactive staff: not staff');
select is(public.has_permission('content', 'view'), false, 'inactive staff: grants no longer apply');
select is(public.can('blog', 'edit'), false, 'inactive staff: can nothing');
select is((select count(*)::int from public.staff_permissions), 0, 'inactive staff: cannot read their grants');
reset role;

-- Helpers: super admin ---------------------------------------------------------------------------
update public.modules set enabled = false where key = 'blog';
select tests.claims_for('c0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.is_super_admin(), true, 'super admin: is super admin');
select is(public.has_permission('crm', 'delete'), true, 'super admin: has every permission');
select is(public.can('content', 'publish'), true, 'super admin: can act on core scopes');
select is(public.can('blog', 'edit'), false, 'super admin: cannot act on a disabled module');
reset role;

select * from finish();
rollback;
