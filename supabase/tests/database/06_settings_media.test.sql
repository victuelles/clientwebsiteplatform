-- Phase 3: update_site_settings, media tables, storage policies, and media references.
begin;
\ir ../helpers.psql
select plan(40);

select tests.create_user('f0000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('f0000000-0000-4000-8000-000000000002', 'viewer@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000003', 'creator@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000004', 'deleter@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000005', 'user@t.test', 'user');
insert into public.staff_permissions (user_id, scope, action) values
  ('f0000000-0000-4000-8000-000000000002', 'media', 'view'),
  ('f0000000-0000-4000-8000-000000000003', 'media', 'view'),
  ('f0000000-0000-4000-8000-000000000003', 'media', 'create'),
  ('f0000000-0000-4000-8000-000000000003', 'media', 'edit'),
  ('f0000000-0000-4000-8000-000000000004', 'media', 'view'),
  ('f0000000-0000-4000-8000-000000000004', 'media', 'delete'),
  ('f0000000-0000-4000-8000-000000000002', 'content', 'edit');

-- Fixture asset (as postgres).
insert into public.media_assets (id, storage_path, filename, mime_type, size_bytes, uploaded_by)
values ('f1000000-0000-4000-8000-000000000001', 'library/2026/09/f1000000-0000-4000-8000-000000000001.png',
        'logo.png', 'image/png', 100, 'f0000000-0000-4000-8000-000000000001');

-- update_site_settings --------------------------------------------------------------------------
select tests.claims_for('f0000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$ select public.update_site_settings('{"tagline": "x"}') $$, '42501',
  'Only the super admin can change site settings.', 'staff cannot change settings (even with other permissions)');
reset role;

select tests.claims_for('f0000000-0000-4000-8000-000000000005');
set local role authenticated;
select throws_ok($$ select public.update_site_settings('{"tagline": "x"}') $$, '42501', null, 'users cannot change settings');
reset role;

select tests.clear_claims();
set local role anon;
select throws_ok($$ select public.update_site_settings('{"tagline": "x"}') $$, '42501', null, 'anon cannot call update_site_settings');
reset role;

select tests.claims_for('f0000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$ select public.update_site_settings('{"is_admin": true}') $$, '22023',
  'Unknown or read-only setting "is_admin".', 'unknown keys are rejected');
select throws_ok($$ select public.update_site_settings('{"id": false}') $$, '22023', null, 'the id cannot be changed');
select throws_ok($$ select public.update_site_settings('{"updated_by": null}') $$, '22023', null, 'updated_by is read-only');
select throws_ok($$ select public.update_site_settings('{"site_name": " "}') $$, '22023',
  'The site name cannot be empty.', 'the site name cannot be blank');
select throws_ok($$ select public.update_site_settings('[1]') $$, '22023', null, 'changes must be an object');
select is(
  public.update_site_settings('{"tagline": "Tested", "show_top_bar": false, "phone": "+1 (650) 410-7800"}'),
  array['show_top_bar', 'tagline'],
  'returns only the fields that actually changed'
);
select is(
  (select metadata -> 'fields' from public.audit_log where action = 'settings.updated'
   and actor_id = 'f0000000-0000-4000-8000-000000000001'),
  '["show_top_bar", "tagline"]'::jsonb,
  'one audit entry lists the changed fields'
);
select is(public.update_site_settings('{"tagline": "Tested"}'), '{}'::text[], 'an unchanged save changes nothing');

-- media references follow the brand asset fields
select lives_ok($$ select public.update_site_settings('{"logo_media_id": "f1000000-0000-4000-8000-000000000001"}') $$,
  'the super admin can set the logo');
reset role;
select results_eq(
  $$ select entity_table, entity_id, field from public.media_references where media_id = 'f1000000-0000-4000-8000-000000000001' $$,
  $$ values ('site_settings', 'site', 'logo_media_id') $$,
  'setting the logo records a media reference'
);
select throws_ok($$ delete from public.media_assets where id = 'f1000000-0000-4000-8000-000000000001' $$,
  '23503', null, 'a referenced asset cannot be deleted (even as the table owner)');
select tests.claims_for('f0000000-0000-4000-8000-000000000001');
set local role authenticated;
select public.update_site_settings('{"logo_media_id": null}');
reset role;
select is((select count(*)::int from public.media_references where media_id = 'f1000000-0000-4000-8000-000000000001'),
  0, 'clearing the logo removes the reference');

-- media_references: no direct writes ---------------------------------------------------------------
select tests.claims_for('f0000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$ insert into public.media_references (media_id, entity_table, entity_id, field)
  values ('f1000000-0000-4000-8000-000000000001', 'x', 'y', 'z') $$, '42501', null, 'even the super admin cannot insert media_references directly');
select throws_ok($$ select public.set_media_reference('x', 'y', 'z', null) $$, '42501', null, 'set_media_reference is not callable through the API');
reset role;
set local role service_role;
select throws_ok($$ select public.set_media_reference('x', 'y', 'z', null) $$, '42501', null, 'not even by service_role');
reset role;

-- media_assets visibility --------------------------------------------------------------------------
select tests.clear_claims();
set local role anon;
select is((select filename from public.media_assets where id = 'f1000000-0000-4000-8000-000000000001'), 'logo.png', 'anon can read public asset fields');
select throws_ok($$ select uploaded_by from public.media_assets $$, '42501', null, 'anon cannot read uploaded_by');
select throws_ok($$ insert into public.media_assets (storage_path, filename, mime_type, size_bytes) values ('a', 'a', 'image/png', 1) $$,
  '42501', null, 'anon cannot insert assets');
select throws_ok($$ select * from public.media_references $$, '42501', null, 'anon cannot read media references');
reset role;

-- media_assets writes by permission ---------------------------------------------------------------
select tests.claims_for('f0000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$ insert into public.media_assets (storage_path, filename, mime_type, size_bytes, uploaded_by)
  values ('library/v.png', 'v.png', 'image/png', 1, 'f0000000-0000-4000-8000-000000000002') $$, '42501', null,
  'staff with only media view cannot add assets');
update public.media_assets set alt_text = 'hacked' where id = 'f1000000-0000-4000-8000-000000000001';
reset role;
select is((select alt_text from public.media_assets where id = 'f1000000-0000-4000-8000-000000000001'), null,
  'staff with only media view cannot edit assets');

select tests.claims_for('f0000000-0000-4000-8000-000000000003');
set local role authenticated;
select lives_ok($$ insert into public.media_assets (id, storage_path, filename, mime_type, size_bytes, uploaded_by)
  values ('f1000000-0000-4000-8000-000000000002', 'library/c.png', 'c.png', 'image/png', 1, 'f0000000-0000-4000-8000-000000000003') $$,
  'staff with media create can add assets');
select throws_ok($$ insert into public.media_assets (storage_path, filename, mime_type, size_bytes, uploaded_by)
  values ('library/d.png', 'd.png', 'image/png', 1, 'f0000000-0000-4000-8000-000000000001') $$, '42501', null,
  'uploaded_by must be the uploader');
select lives_ok($$ update public.media_assets set alt_text = 'A coral square' where id = 'f1000000-0000-4000-8000-000000000002' $$,
  'staff with media edit can edit alt text');
select throws_ok($$ update public.media_assets set storage_path = 'elsewhere' where id = 'f1000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'nobody can change an asset''s storage path');
delete from public.media_assets where id = 'f1000000-0000-4000-8000-000000000002';
reset role;
select is((select count(*)::int from public.media_assets where id = 'f1000000-0000-4000-8000-000000000002'), 1,
  'staff without media delete cannot delete assets');

select tests.claims_for('f0000000-0000-4000-8000-000000000004');
set local role authenticated;
delete from public.media_assets where id = 'f1000000-0000-4000-8000-000000000002';
reset role;
select is((select count(*)::int from public.media_assets where id = 'f1000000-0000-4000-8000-000000000002'), 0,
  'staff with media delete can delete assets');

-- folders: only empty folders can be deleted ----------------------------------------------------------
insert into public.media_folders (id, name) values ('f2000000-0000-4000-8000-000000000001', 'Logos');
update public.media_assets set folder_id = 'f2000000-0000-4000-8000-000000000001' where id = 'f1000000-0000-4000-8000-000000000001';
select throws_ok($$ delete from public.media_folders where id = 'f2000000-0000-4000-8000-000000000001' $$, '23503', null,
  'a folder with files cannot be deleted');
select throws_ok($$ insert into public.media_folders (name) values ('logos') $$, '23505', null,
  'folder names are unique (case-insensitive) within a parent');

-- storage.objects policies (the Storage API sets storage.allow_delete_query for deletes) -------------
select set_config('storage.allow_delete_query', 'true', true);
insert into storage.objects (bucket_id, name) values ('media', 'library/existing.png');

select tests.clear_claims();
set local role anon;
select is((select count(*)::int from storage.objects where bucket_id = 'media' and name = 'library/existing.png'), 1,
  'anon can read media objects');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('media', 'library/anon.png') $$, '42501', null,
  'anon cannot upload');
reset role;

select tests.claims_for('f0000000-0000-4000-8000-000000000005');
set local role authenticated;
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('media', 'library/user.png') $$, '42501', null,
  'regular users cannot upload');
reset role;

select tests.claims_for('f0000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('media', 'library/viewer.png') $$, '42501', null,
  'staff with only media view cannot upload');
reset role;

select tests.claims_for('f0000000-0000-4000-8000-000000000003');
set local role authenticated;
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('media', 'library/creator.png') $$,
  'staff with media create can upload');
delete from storage.objects where name = 'library/creator.png';
reset role;
select is((select count(*)::int from storage.objects where name = 'library/creator.png'), 1,
  'staff with media create but not delete cannot delete objects');

select tests.claims_for('f0000000-0000-4000-8000-000000000004');
set local role authenticated;
delete from storage.objects where name = 'library/creator.png';
reset role;
select is((select count(*)::int from storage.objects where name = 'library/creator.png'), 0,
  'staff with media delete can delete objects');

-- A disabled... core scope: media is always enabled; an inactive staff member loses access.
update public.profiles set is_active = false where id = 'f0000000-0000-4000-8000-000000000003';
select tests.claims_for('f0000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('media', 'library/inactive.png') $$, '42501', null,
  'inactive staff cannot upload');
reset role;

select * from finish();
rollback;
