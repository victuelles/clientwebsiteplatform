-- audit_log is append-only through functions; set_user_role, set_user_active, set_module_enabled,
-- log_audit, and bootstrap_super_admin enforce who may call them and the forbidden cases.
begin;
\ir ../helpers.psql
select plan(37);

select tests.create_user('d0000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('d0000000-0000-4000-8000-000000000002', 'staff@t.test', 'staff');
select tests.create_user('d0000000-0000-4000-8000-000000000003', 'user@t.test', 'user');
insert into public.staff_permissions (user_id, scope, action)
values ('d0000000-0000-4000-8000-000000000002', 'content', 'edit');

-- audit_log: no direct writes for anyone ------------------------------------------------------
select tests.clear_claims();
set local role anon;
select throws_ok($$ insert into public.audit_log (action) values ('x') $$, '42501', null, 'anon cannot insert audit_log');
select throws_ok($$ select * from public.audit_log $$, '42501', null, 'anon cannot read audit_log');
select throws_ok($$ select public.log_audit('x') $$, '42501', null, 'anon cannot call log_audit');
reset role;

select tests.claims_for('d0000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$ insert into public.audit_log (action) values ('x') $$, '42501', null, 'users cannot insert audit_log');
select lives_ok($$ select public.log_audit('user.did_something', 'content') $$, 'users can log their own actions through log_audit');
select is((select count(*)::int from public.audit_log), 0, 'users cannot read audit_log');
reset role;

select tests.claims_for('d0000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$ insert into public.audit_log (action) values ('x') $$, '42501', null, 'the super admin cannot insert audit_log directly');
select throws_ok($$ update public.audit_log set action = 'y' $$, '42501', null, 'the super admin cannot update audit_log');
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'the super admin cannot delete audit_log');
select is(
  (select actor_id from public.audit_log where action = 'user.did_something'),
  'd0000000-0000-4000-8000-000000000003'::uuid,
  'the super admin reads the audit log; log_audit records the caller as actor'
);
reset role;

set local role service_role;
select throws_ok($$ insert into public.audit_log (action) values ('x') $$, '42501', null, 'service_role cannot insert audit_log directly');
reset role;

-- Non-super-admins cannot call admin functions ---------------------------------------------------
select tests.claims_for('d0000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-000000000003', 'staff') $$,
  '42501', 'Only the super admin can change user roles.', 'staff cannot call set_user_role'
);
select throws_ok(
  $$ select public.set_user_active('d0000000-0000-4000-8000-000000000003', false) $$,
  '42501', 'Only the super admin can activate or deactivate users.', 'staff cannot call set_user_active'
);
select throws_ok(
  $$ select public.set_module_enabled('blog', true) $$,
  '42501', 'Only the super admin can enable or disable modules.', 'staff cannot call set_module_enabled'
);
reset role;

select tests.claims_for('d0000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-000000000003', 'staff') $$,
  '42501', 'Only the super admin can change user roles.', 'a user cannot promote themselves'
);
select throws_ok(
  $$ select public.set_user_active('d0000000-0000-4000-8000-000000000002', false) $$,
  '42501', null, 'a user cannot call set_user_active'
);
select throws_ok(
  $$ select public.bootstrap_super_admin('d0000000-0000-4000-8000-000000000003', 'user@t.test') $$,
  '42501', null, 'a user cannot call bootstrap_super_admin'
);
reset role;

select tests.clear_claims();
set local role anon;
select throws_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-000000000003', 'staff') $$,
  '42501', null, 'anon cannot call set_user_role'
);
select throws_ok(
  $$ select public.set_module_enabled('blog', true) $$,
  '42501', null, 'anon cannot call set_module_enabled'
);
reset role;

-- Super admin: allowed and forbidden cases ---------------------------------------------------------
select tests.claims_for('d0000000-0000-4000-8000-000000000001');
set local role authenticated;

select lives_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-000000000003', 'staff') $$,
  'the super admin can promote a user to staff'
);
select is(
  (select role from public.profiles where id = 'd0000000-0000-4000-8000-000000000003'),
  'staff'::public.app_role, 'the role changed'
);
select is(
  (select count(*)::int from public.audit_log where action = 'user.role_changed'
     and target_id = 'd0000000-0000-4000-8000-000000000003'),
  1, 'the role change was audited'
);
select throws_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-000000000003', 'super_admin') $$,
  '22023', null, 'super_admin cannot be assigned'
);
select throws_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-000000000001', 'user') $$,
  '42501', 'The super admin''s role cannot be changed.', 'the super admin cannot change their own role'
);
select throws_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-00000000ffff', 'staff') $$,
  'P0002', null, 'unknown users are rejected'
);
select lives_ok(
  $$ select public.set_user_role('d0000000-0000-4000-8000-000000000002', 'user') $$,
  'the super admin can demote staff'
);
select is(
  (select count(*)::int from public.staff_permissions where user_id = 'd0000000-0000-4000-8000-000000000002'),
  0, 'demoting staff revokes their grants'
);

select throws_ok(
  $$ select public.set_user_active('d0000000-0000-4000-8000-000000000001', false) $$,
  '42501', 'The super admin cannot be deactivated.', 'the super admin cannot be deactivated'
);
select lives_ok(
  $$ select public.set_user_active('d0000000-0000-4000-8000-000000000003', false) $$,
  'the super admin can deactivate a user'
);
select is(
  (select is_active from public.profiles where id = 'd0000000-0000-4000-8000-000000000003'),
  false, 'the user is inactive'
);
select is(
  (select count(*)::int from public.audit_log where action = 'user.deactivated'),
  1, 'the deactivation was audited'
);

select lives_ok($$ select public.set_module_enabled('shop', true) $$, 'the super admin can enable a module');
select is((select enabled from public.modules where key = 'shop'), true, 'the module is enabled');
select is(
  (select count(*)::int from public.audit_log where action = 'module.enabled' and scope = 'shop'),
  1, 'enabling the module was audited'
);
select throws_ok(
  $$ select public.set_module_enabled('content', true) $$,
  'P0002', 'Unknown module "content".', 'core scopes are not modules'
);
reset role;

-- bootstrap_super_admin: service_role only, never when a super admin exists -------------------------
set local role service_role;
select is(
  public.bootstrap_super_admin('d0000000-0000-4000-8000-000000000002', 'staff@t.test'),
  false, 'bootstrap does nothing while a super admin exists'
);
reset role;

update public.profiles set role = 'user' where id = 'd0000000-0000-4000-8000-000000000001';
set local role service_role;
select is(
  public.bootstrap_super_admin('d0000000-0000-4000-8000-000000000002', 'STAFF@t.test'),
  true, 'bootstrap promotes the matching confirmed user when no super admin exists'
);
reset role;

select * from finish();
rollback;
