-- site_settings and modules: anyone reads, only the super admin updates.
-- permission_scopes: signed-in users read, nobody writes.
begin;
\ir ../helpers.psql
select plan(18);

select tests.create_user('b0000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('b0000000-0000-4000-8000-000000000002', 'staff@t.test', 'staff');
select tests.create_user('b0000000-0000-4000-8000-000000000003', 'user@t.test', 'user');
insert into public.staff_permissions (user_id, scope, action)
values ('b0000000-0000-4000-8000-000000000002', 'content', 'edit');

-- Anon ----------------------------------------------------------------------------------------
select tests.clear_claims();
set local role anon;
select is((select count(*)::int from public.site_settings), 1, 'anon can read site_settings');
select is((select count(*)::int from public.modules), 9, 'anon can read modules');
select throws_ok(
  $$ update public.site_settings set site_name = 'Anon' $$,
  '42501', null, 'anon cannot update site_settings'
);
select throws_ok(
  $$ update public.modules set enabled = true $$,
  '42501', null, 'anon cannot update modules'
);
select throws_ok(
  $$ select * from public.permission_scopes $$,
  '42501', null, 'anon cannot read permission_scopes'
);
reset role;

-- A regular user --------------------------------------------------------------------------------
select tests.claims_for('b0000000-0000-4000-8000-000000000003');
set local role authenticated;
update public.site_settings set site_name = 'User was here';
update public.modules set enabled = true where key = 'blog';
select is((select count(*)::int from public.permission_scopes), 11, 'users can read permission scopes');
select throws_ok(
  $$ insert into public.permission_scopes (key, label, kind) values ('x', 'X', 'core') $$,
  '42501', null, 'users cannot write permission_scopes'
);
select throws_ok(
  $$ insert into public.modules (key) values ('content') $$,
  '42501', null, 'users cannot insert modules'
);
select throws_ok(
  $$ delete from public.site_settings $$,
  '42501', null, 'users cannot delete site_settings'
);
reset role;
select is((select site_name from public.site_settings), 'North / Co', 'a user cannot update site_settings');
select is((select enabled from public.modules where key = 'blog'), false, 'a user cannot update modules');

-- Staff (even with a content permission) ------------------------------------------------------------
select tests.claims_for('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
update public.site_settings set site_name = 'Staff was here';
update public.modules set enabled = true where key = 'blog';
reset role;
select is((select site_name from public.site_settings), 'North / Co', 'staff cannot update site_settings');
select is((select enabled from public.modules where key = 'blog'), false, 'staff cannot update modules');

-- Super admin -------------------------------------------------------------------------------------
select tests.claims_for('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
update public.site_settings set site_name = 'Client Site';
update public.modules set enabled = true where key = 'blog';
reset role;
select is((select site_name from public.site_settings), 'Client Site', 'the super admin can update site_settings');
select is(
  (select updated_by from public.site_settings),
  'b0000000-0000-4000-8000-000000000001'::uuid,
  'site_settings.updated_by records the super admin'
);
select is((select enabled from public.modules where key = 'blog'), true, 'the super admin can update modules');

select throws_ok(
  $$ insert into public.site_settings (id) values (false) $$,
  '23514', null, 'site_settings cannot have a second row'
);
select is(
  (select count(*)::int from public.modules m join public.permission_scopes s using (key) where s.kind <> 'module'),
  0,
  'every module row is a module scope'
);

select * from finish();
rollback;
