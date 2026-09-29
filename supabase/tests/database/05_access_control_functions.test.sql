-- Phase 2 functions: get_my_permissions, set_staff_permissions, admin_list_staff, and
-- set_user_role removing grants on demotion.
begin;
\ir ../helpers.psql
select plan(33);

select tests.create_user('e0000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('e0000000-0000-4000-8000-000000000002', 'staff@t.test', 'staff');
select tests.create_user('e0000000-0000-4000-8000-000000000003', 'user@t.test', 'user');
select tests.create_user('e0000000-0000-4000-8000-000000000004', 'staff2@t.test', 'staff');
insert into public.staff_permissions (user_id, scope, action) values
  ('e0000000-0000-4000-8000-000000000002', 'content', 'view'),
  ('e0000000-0000-4000-8000-000000000003', 'content', 'view'); -- stray grant on a user

-- get_my_permissions -------------------------------------------------------------------------
select tests.clear_claims();
set local role anon;
select is((select count(*)::int from public.get_my_permissions()), 0, 'anon: no permissions');
reset role;

select tests.claims_for('e0000000-0000-4000-8000-000000000003');
set local role authenticated;
select is((select count(*)::int from public.get_my_permissions()), 0, 'user: no permissions, even with a stray grant');
reset role;

select tests.claims_for('e0000000-0000-4000-8000-000000000002');
set local role authenticated;
select results_eq(
  $$ select scope, action::text from public.get_my_permissions() $$,
  $$ values ('content', 'view') $$,
  'staff: exactly their grants'
);
reset role;

select tests.claims_for('e0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(
  (select count(*)::int from public.get_my_permissions()),
  (select count(*)::int * 5 from public.permission_scopes),
  'super admin: every scope x every action'
);
reset role;

update public.profiles set is_active = false where id = 'e0000000-0000-4000-8000-000000000002';
select tests.claims_for('e0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.get_my_permissions()), 0, 'inactive staff: no permissions');
reset role;
update public.profiles set is_active = true where id = 'e0000000-0000-4000-8000-000000000002';

-- set_staff_permissions: who may call it -----------------------------------------------------------
select tests.claims_for('e0000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '[{"scope":"media","action":"view"}]') $$,
  '42501', 'Only the super admin can change staff permissions.', 'staff cannot set permissions (not even their own)'
);
reset role;

select tests.claims_for('e0000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '[]') $$,
  '42501', null, 'users cannot set permissions'
);
reset role;

select tests.clear_claims();
set local role anon;
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '[]') $$,
  '42501', null, 'anon cannot call set_staff_permissions'
);
reset role;

-- set_staff_permissions: validation ---------------------------------------------------------------
select tests.claims_for('e0000000-0000-4000-8000-000000000001');
set local role authenticated;

select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '[{"scope":"nope","action":"view"}]') $$,
  '22023', 'Unknown permission scope "nope".', 'unknown scopes are rejected'
);
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '[{"scope":"content","action":"destroy"}]') $$,
  '22023', 'Unknown permission action "destroy".', 'unknown actions are rejected'
);
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '{"scope":"content"}') $$,
  '22023', null, 'a non-array payload is rejected'
);
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '[{"scope":"content"}]') $$,
  '22023', null, 'an object without action is rejected'
);
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000003', '[{"scope":"content","action":"view"}]') $$,
  '22023', 'Permissions can only be granted to staff members.', 'regular users cannot be granted permissions'
);
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000001', '[{"scope":"content","action":"view"}]') $$,
  '22023', 'Permissions can only be granted to staff members.', 'the super admin cannot be edited'
);
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-00000000ffff', '[]') $$,
  'P0002', null, 'unknown users are rejected'
);

-- A rejected call changes nothing (mixed valid + invalid input).
select throws_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002',
       '[{"scope":"media","action":"view"},{"scope":"nope","action":"view"}]') $$,
  '22023', null, 'mixed valid and invalid input is rejected as a whole'
);
reset role;
select results_eq(
  $$ select scope, action::text from public.staff_permissions where user_id = 'e0000000-0000-4000-8000-000000000002' $$,
  $$ values ('content', 'view') $$,
  'and leaves the grants untouched'
);

-- set_staff_permissions: replacing grants -----------------------------------------------------------
select tests.claims_for('e0000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002',
       '[{"scope":"content","action":"edit"},{"scope":"media","action":"view"},{"scope":"media","action":"view"},{"scope":"blog","action":"publish"}]') $$,
  'the super admin can replace grants (duplicates ignored)'
);
select results_eq(
  $$ select scope, action::text from public.staff_permissions
     where user_id = 'e0000000-0000-4000-8000-000000000002' order by scope, action $$,
  $$ values ('blog', 'publish'), ('content', 'edit'), ('media', 'view') $$,
  'grants now match the given set exactly'
);
select is(
  (select granted_by from public.staff_permissions
   where user_id = 'e0000000-0000-4000-8000-000000000002' and scope = 'media'),
  'e0000000-0000-4000-8000-000000000001'::uuid,
  'new grants record the super admin as granted_by'
);
select is(
  (select count(*)::int from public.audit_log where action = 'staff.permissions_updated'),
  1, 'exactly one audit entry was written'
);
select is(
  (select metadata from public.audit_log where action = 'staff.permissions_updated'),
  '{"added": [{"scope": "blog", "action": "publish"}, {"scope": "content", "action": "edit"}, {"scope": "media", "action": "view"}],
    "removed": [{"scope": "content", "action": "view"}]}'::jsonb,
  'the audit entry lists added and removed grants'
);

select lives_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002',
       '[{"scope":"content","action":"edit"},{"scope":"media","action":"view"},{"scope":"blog","action":"publish"}]') $$,
  'saving the same set again works'
);
select is(
  (select count(*)::int from public.audit_log where action = 'staff.permissions_updated'),
  1, 'an unchanged set writes no audit entry'
);

select lives_ok(
  $$ select public.set_staff_permissions('e0000000-0000-4000-8000-000000000002', '[]') $$,
  'an empty array revokes everything'
);
select is(
  (select count(*)::int from public.staff_permissions where user_id = 'e0000000-0000-4000-8000-000000000002'),
  0, 'no grants remain'
);

-- admin_list_staff ----------------------------------------------------------------------------------
select is(
  (select count(*)::int from public.admin_list_staff() where email like '%@t.test'),
  2, 'the super admin lists every staff member (and only staff)'
);
select is(
  (select email from public.admin_list_staff('e0000000-0000-4000-8000-000000000004')),
  'staff2@t.test', 'admin_list_staff(id) returns one staff member'
);
select is(
  (select count(*)::int from public.admin_list_staff('e0000000-0000-4000-8000-000000000001')),
  0, 'the super admin is not listed as staff'
);
reset role;

select tests.claims_for('e0000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok(
  $$ select * from public.admin_list_staff() $$,
  '42501', null, 'staff cannot list staff'
);
reset role;

-- set_user_role: demotion deletes grants in the same transaction --------------------------------------
select tests.claims_for('e0000000-0000-4000-8000-000000000001');
set local role authenticated;
select public.set_staff_permissions('e0000000-0000-4000-8000-000000000004',
  '[{"scope":"content","action":"view"},{"scope":"media","action":"edit"}]');
select lives_ok(
  $$ select public.set_user_role('e0000000-0000-4000-8000-000000000004', 'user') $$,
  'the super admin demotes a staff member'
);
select is(
  (select count(*)::int from public.staff_permissions where user_id = 'e0000000-0000-4000-8000-000000000004'),
  0, 'their grants are gone'
);
select is(
  (select (metadata ->> 'permissions_revoked')::int from public.audit_log
   where action = 'user.role_changed' and target_id = 'e0000000-0000-4000-8000-000000000004'),
  2, 'the audit entry records how many grants were revoked'
);
reset role;

select * from finish();
rollback;
