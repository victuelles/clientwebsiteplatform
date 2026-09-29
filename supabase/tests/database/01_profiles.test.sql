-- Profiles: users read only their own row and can change only full_name/avatar_url; the super
-- admin reads all rows; only one super admin can exist.
begin;
\ir ../helpers.psql
select plan(19);

select tests.create_user('a0000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('a0000000-0000-4000-8000-000000000002', 'staff@t.test', 'staff');
select tests.create_user('a0000000-0000-4000-8000-000000000003', 'user1@t.test', 'user');
select tests.create_user('a0000000-0000-4000-8000-000000000004', 'user2@t.test', 'user');
select set_config('tests.total_profiles', (select count(*) from public.profiles)::text, true);

-- auth trigger
select is(
  (select role from public.profiles where email = 'user1@t.test'),
  'user'::public.app_role,
  'new auth users get a profile with role user'
);

update auth.users set email = 'user1-new@t.test' where id = 'a0000000-0000-4000-8000-000000000003';
select is(
  (select email::text from public.profiles where id = 'a0000000-0000-4000-8000-000000000003'),
  'user1-new@t.test',
  'profiles.email follows auth.users.email'
);

-- A regular user ----------------------------------------------------------------------------
select tests.claims_for('a0000000-0000-4000-8000-000000000003');
set local role authenticated;

select is((select count(*)::int from public.profiles), 1, 'a user sees exactly one profile');
select is(
  (select id from public.profiles),
  'a0000000-0000-4000-8000-000000000003'::uuid,
  'and it is their own'
);

select lives_ok(
  $$ update public.profiles set full_name = 'Own Name', avatar_url = 'https://x.test/a.png'
     where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'a user can update their own full_name and avatar_url'
);

select throws_ok(
  $$ update public.profiles set role = 'super_admin' where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'a user cannot update their role'
);
select throws_ok(
  $$ update public.profiles set email = 'x@t.test' where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'a user cannot update their email'
);
select throws_ok(
  $$ update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'a user cannot update is_active'
);
select throws_ok(
  $$ insert into public.profiles (id, email) values (gen_random_uuid(), 'new@t.test') $$,
  '42501', null, 'a user cannot insert profiles'
);
select throws_ok(
  $$ delete from public.profiles where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'a user cannot delete profiles'
);

-- Updating someone else's row silently matches nothing.
update public.profiles set full_name = 'Hacked' where id = 'a0000000-0000-4000-8000-000000000004';

reset role;
select is(
  (select full_name from public.profiles where id = 'a0000000-0000-4000-8000-000000000004'),
  null,
  'a user cannot update another user''s profile'
);
select is(
  (select full_name from public.profiles where id = 'a0000000-0000-4000-8000-000000000003'),
  'Own Name',
  'the user''s own update was saved'
);

-- Staff ---------------------------------------------------------------------------------------
select tests.claims_for('a0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.profiles), 1, 'staff see only their own profile (for now)');
reset role;

-- Super admin -----------------------------------------------------------------------------------
select tests.claims_for('a0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(
  (select count(*) from public.profiles)::text,
  current_setting('tests.total_profiles'),
  'the super admin sees every profile'
);
reset role;

-- Anon --------------------------------------------------------------------------------------------
select tests.clear_claims();
set local role anon;
select is((select count(*)::int from public.profiles), 0, 'anon sees no profiles');
reset role;

-- Only one super admin ------------------------------------------------------------------------------
select throws_ok(
  $$ update public.profiles set role = 'super_admin' where id = 'a0000000-0000-4000-8000-000000000004' $$,
  '23505', null, 'a second super_admin cannot exist'
);

-- Inactive users ----------------------------------------------------------------------------------
update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-000000000003';
select tests.claims_for('a0000000-0000-4000-8000-000000000003');
set local role authenticated;
select is(
  (select count(*)::int from public.profiles), 1,
  'an inactive user can still read their own profile (so the app can sign them out)'
);
select is(public.current_app_role(), null, 'an inactive user has no app role');
update public.profiles set full_name = 'Inactive edit' where id = 'a0000000-0000-4000-8000-000000000003';
reset role;
select is(
  (select full_name from public.profiles where id = 'a0000000-0000-4000-8000-000000000003'),
  'Own Name',
  'an inactive user cannot update their profile'
);

select * from finish();
rollback;
