-- Phase 4: pages, sections, revisions, menus, and contact submissions (RLS and functions).
begin;
\ir ../helpers.psql
select plan(43);

select tests.create_user('f4000000-0000-4000-8000-000000000001', 'admin@p.test', 'super_admin');
select tests.create_user('f4000000-0000-4000-8000-000000000002', 'editor@p.test', 'staff');
select tests.create_user('f4000000-0000-4000-8000-000000000003', 'publisher@p.test', 'staff');
select tests.create_user('f4000000-0000-4000-8000-000000000004', 'deleter@p.test', 'staff');
select tests.create_user('f4000000-0000-4000-8000-000000000005', 'user@p.test', 'user');
insert into public.staff_permissions (user_id, scope, action) values
  ('f4000000-0000-4000-8000-000000000002', 'content', 'view'),
  ('f4000000-0000-4000-8000-000000000002', 'content', 'edit'),
  ('f4000000-0000-4000-8000-000000000003', 'content', 'view'),
  ('f4000000-0000-4000-8000-000000000003', 'content', 'edit'),
  ('f4000000-0000-4000-8000-000000000003', 'content', 'publish'),
  ('f4000000-0000-4000-8000-000000000004', 'content', 'view'),
  ('f4000000-0000-4000-8000-000000000004', 'content', 'delete');

-- Fixtures (as postgres): a draft page with a contact form, and a second draft to delete.
-- The seeded pages (migration 20260929150300) are published: home ...001, about ...002, contact ...005.
insert into public.pages (id, title, slug) values
  ('f4100000-0000-4000-8000-000000000001', 'Draft', 'draft-test'),
  ('f4100000-0000-4000-8000-000000000002', 'Disposable', 'disposable-test');
insert into public.page_sections (page_id, type, sort_order, props) values
  ('f4100000-0000-4000-8000-000000000001', 'contact_form', 0, '{}');

-- Anonymous visitors --------------------------------------------------------------------------
select tests.clear_claims();
set local role anon;
select is((select count(*)::int from public.pages where id = 'f4100000-0000-4000-8000-000000000001'), 0,
  'anon cannot see draft pages');
select is((select count(*)::int from public.pages where is_home), 1, 'anon can see the published homepage');
select ok((select jsonb_array_length(published_sections) from public.pages where is_home) = 9,
  'anon reads the published sections snapshot');
select throws_ok($$ select * from public.page_sections $$, '42501', null, 'anon cannot read draft sections');
select throws_ok($$ select * from public.page_revisions $$, '42501', null, 'anon cannot read revisions');
select throws_ok($$ select created_by from public.pages $$, '42501', null, 'anon cannot read non-public page columns');
select throws_ok($$ select public.publish_page('a0000000-0000-4000-8000-000000000001') $$, '42501', null,
  'anon cannot publish');
select is((select count(*)::int from public.menu_items), 14, 'anon can read menu items');
reset role;

-- A signed-in user without content permissions ------------------------------------------------
select tests.claims_for('f4000000-0000-4000-8000-000000000005');
set local role authenticated;
select is((select count(*)::int from public.page_sections), 0, 'users see no draft sections');
select is((select count(*)::int from public.pages where status = 'draft'), 0, 'users see no draft pages');
select throws_ok($$ select public.restore_revision((select id from public.page_revisions limit 1)) $$,
  '42501', null, 'users cannot restore revisions');
select throws_ok($$ select public.discard_draft('a0000000-0000-4000-8000-000000000001') $$, '42501', null,
  'users cannot discard drafts');
select throws_ok($$ select public.save_menu('header', null, '[]') $$, '42501', null, 'users cannot save menus');
reset role;

-- Editor: 'edit' but not 'publish' ------------------------------------------------------------
select tests.claims_for('f4000000-0000-4000-8000-000000000002');
set local role authenticated;
select lives_ok($$ update public.page_sections set props = jsonb_set(props, '{headline}', '"Edited"')
  where page_id = 'a0000000-0000-4000-8000-000000000001' and type = 'hero' $$, 'editors can change draft sections');
select throws_ok($$ select public.publish_page('a0000000-0000-4000-8000-000000000001') $$, '42501',
  'You don''t have permission to publish pages.', 'editors without publish cannot publish');
select throws_ok($$ update public.pages set status = 'published' where id = 'f4100000-0000-4000-8000-000000000001' $$,
  '42501', null, 'publishing columns cannot be written directly');
select throws_ok($$ update public.page_sections set sort_order = 5 where page_id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'sort_order changes only through reorder_sections');
delete from public.pages where id = 'f4100000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.pages where id = 'f4100000-0000-4000-8000-000000000002'), 1,
  'editors without delete cannot delete pages');
select throws_ok($$ select public.set_home_page('a0000000-0000-4000-8000-000000000002') $$, '42501', null,
  'only the super admin can change the homepage');

-- reorder_sections is all or nothing.
create temporary table home_order as
  select array_agg(id order by sort_order) as ids from public.page_sections
  where page_id = 'a0000000-0000-4000-8000-000000000001';
select throws_ok($$ select public.reorder_sections('a0000000-0000-4000-8000-000000000001',
  (select ids[1:8] from home_order)) $$, '22023', null, 'a partial order is rejected');
select is((select array_agg(id order by sort_order) from public.page_sections
  where page_id = 'a0000000-0000-4000-8000-000000000001'), (select ids from home_order),
  'a rejected reorder changes nothing');
select throws_ok($$ select public.reorder_sections('a0000000-0000-4000-8000-000000000001',
  (select ids[1:8] || ids[1] from home_order)) $$, '22023', null, 'duplicate ids are rejected');
select lives_ok($$ select public.reorder_sections('a0000000-0000-4000-8000-000000000001',
  (select array(select unnest(ids) order by 1 desc) from home_order)) $$, 'a complete order is applied');
select is((select array_agg(id order by sort_order) from public.page_sections
  where page_id = 'a0000000-0000-4000-8000-000000000001'),
  (select array(select unnest(ids) order by 1 desc) from home_order), 'sections follow the new order');

-- Revisions and discarding.
select lives_ok($$ select public.restore_revision((select id from public.page_revisions
  where page_id = 'a0000000-0000-4000-8000-000000000001' order by published_at desc limit 1)) $$,
  'editors can restore a revision into the draft');
select is((select props ->> 'headline' from public.page_sections
  where page_id = 'a0000000-0000-4000-8000-000000000001' and type = 'hero'), E'Good ideas\ndeserve',
  'the restored draft matches the revision');
select lives_ok($$ select public.discard_draft('a0000000-0000-4000-8000-000000000002') $$,
  'editors can discard a draft');
select throws_ok($$ select public.discard_draft('f4100000-0000-4000-8000-000000000001') $$, '22023', null,
  'a never-published page has no published version to go back to');

-- Menus.
select lives_ok($$ select public.save_menu('footer_1', 'Explore', '[{"label": "Home",
  "link": {"kind": "page", "pageId": "a0000000-0000-4000-8000-000000000001"}}]') $$, 'editors can save menus');
select is((select count(*)::int from public.menu_items i join public.menus m on m.id = i.menu_id
  where m.key = 'footer_1'), 1, 'save_menu replaces the items');
select throws_ok($$ select public.save_menu('footer_1', 'Explore', '[{"label": "Home", "link": {"kind": "url",
  "href": "/"}, "children": [{"label": "Child", "link": {"kind": "url", "href": "/"}}]}]') $$, '22023', null,
  'footer items cannot have dropdown children');
select is((select count(*)::int from public.menu_items i join public.menus m on m.id = i.menu_id
  where m.key = 'footer_1'), 1, 'a rejected save leaves the menu unchanged');
reset role;

-- Publisher -------------------------------------------------------------------------------------
select tests.claims_for('f4000000-0000-4000-8000-000000000003');
set local role authenticated;
select lives_ok($$ select public.publish_page('f4100000-0000-4000-8000-000000000001') $$, 'publishers can publish');
select is((select status::text from public.pages where id = 'f4100000-0000-4000-8000-000000000001'), 'published',
  'the page is published');
select throws_ok($$ select public.unpublish_page('a0000000-0000-4000-8000-000000000001') $$, '22023', null,
  'the homepage cannot be unpublished');
select lives_ok($$ select public.unpublish_page('f4100000-0000-4000-8000-000000000001') $$,
  'other pages can be unpublished');
reset role;

-- Deleter ---------------------------------------------------------------------------------------
select tests.claims_for('f4000000-0000-4000-8000-000000000004');
set local role authenticated;
delete from public.pages where id = 'f4100000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.pages where id = 'f4100000-0000-4000-8000-000000000002'), 0,
  'users with delete can delete pages');
delete from public.pages where is_home;
select is((select count(*)::int from public.pages where is_home), 1, 'the homepage can never be deleted');
reset role;

-- Contact form ----------------------------------------------------------------------------------
select tests.clear_claims();
set local role anon;
select lives_ok($$ select public.submit_contact_form('a0000000-0000-4000-8000-000000000005', 'Ada',
  'ada@example.test', 'Hello there') $$, 'anon can submit the contact form on the Contact page');
select throws_ok($$ select public.submit_contact_form('a0000000-0000-4000-8000-000000000002', 'Ada',
  'ada@example.test', 'Hello') $$, '22023', 'This page does not accept messages.', 'pages without a form reject submissions');
select throws_ok($$ select public.submit_contact_form('f4100000-0000-4000-8000-000000000001', 'Ada',
  'ada@example.test', 'Hello') $$, '22023', 'This page does not accept messages.', 'unpublished pages reject submissions');
select throws_ok($$ select public.submit_contact_form('a0000000-0000-4000-8000-000000000005', 'Ada',
  'not-an-email', 'Hello') $$, '22023', 'Enter a valid email address.', 'invalid emails are rejected');
reset role;

-- Audit trail -----------------------------------------------------------------------------------
select is(
  (select array_agg(distinct action order by action) from public.audit_log where action in (
    'page.sections_reordered', 'page.revision_restored', 'page.draft_discarded', 'page.published',
    'page.unpublished', 'menu.saved', 'contact.submitted')),
  array['contact.submitted', 'menu.saved', 'page.draft_discarded', 'page.published', 'page.revision_restored',
        'page.sections_reordered', 'page.unpublished'],
  'every page, menu, and contact function writes an audit entry'
);

select * from finish();
rollback;
