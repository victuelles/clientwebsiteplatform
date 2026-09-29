-- The module table policy template (supabase/templates/module-table.sql), applied to a temporary
-- table for the blog module, checked for every role with the module on and off.
-- The POLICIES block below must match the template exactly (src/core/modules/template.test.ts).
begin;
\ir ../helpers.psql
select plan(77);

select tests.create_user('f0000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('f0000000-0000-4000-8000-000000000002', 'owner@t.test', 'user');
select tests.create_user('f0000000-0000-4000-8000-000000000003', 'other@t.test', 'user');
select tests.create_user('f0000000-0000-4000-8000-000000000004', 'nobody@t.test', 'user');
select tests.create_user('f0000000-0000-4000-8000-000000000005', 's_none@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000006', 's_view@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000007', 's_create@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000008', 's_edit@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000009', 's_publish@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000010', 's_delete@t.test', 'staff');
select tests.create_user('f0000000-0000-4000-8000-000000000011', 's_inactive@t.test', 'staff');

insert into public.staff_permissions (user_id, scope, action)
select u.id::uuid, 'blog', a::public.permission_action
from (values
  ('f0000000-0000-4000-8000-000000000006', array['view']),
  ('f0000000-0000-4000-8000-000000000007', array['view', 'create']),
  ('f0000000-0000-4000-8000-000000000008', array['view', 'edit']),
  ('f0000000-0000-4000-8000-000000000009', array['view', 'publish']),
  ('f0000000-0000-4000-8000-000000000010', array['view', 'delete']),
  ('f0000000-0000-4000-8000-000000000011', array['view', 'create', 'edit', 'delete', 'publish'])
) as u (id, actions)
cross join unnest(u.actions) as a;

update public.profiles set is_active = false where id = 'f0000000-0000-4000-8000-000000000011';

create table public.tmpl_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  status text not null default 'draft' check (status in ('draft', 'published')),
  title text not null
);
grant select, insert, update, delete on public.tmpl_items to anon, authenticated;

-- BEGIN POLICIES
alter table public.tmpl_items enable row level security;

create policy "Public read: published rows while blog is on"
  on public.tmpl_items for select
  to anon, authenticated
  using (status = 'published' and (select public.module_enabled('blog')));

create policy "Owner read: own rows while blog is on"
  on public.tmpl_items for select
  to authenticated
  using (user_id = (select auth.uid()) and (select public.module_enabled('blog')));

create policy "Staff read: blog view"
  on public.tmpl_items for select
  to authenticated
  using ((select public.can('blog', 'view')));

create policy "Super admin read: also while blog is off"
  on public.tmpl_items for select
  to authenticated
  using ((select public.is_super_admin()));

create policy "Owner insert: own drafts while blog is on"
  on public.tmpl_items for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('blog'))
  );

create policy "Owner update: own drafts while blog is on"
  on public.tmpl_items for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('blog'))
  )
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('blog'))
  );

create policy "Owner delete: own drafts while blog is on"
  on public.tmpl_items for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('blog'))
  );

create policy "Staff insert: blog create (publish to insert published rows)"
  on public.tmpl_items for insert
  to authenticated
  with check (
    (select public.can('blog', 'create'))
    and (status = 'draft' or (select public.can('blog', 'publish')))
  );

create policy "Staff update: blog edit (publish to set or keep published)"
  on public.tmpl_items for update
  to authenticated
  using ((select public.can('blog', 'edit')) or (select public.can('blog', 'publish')))
  with check (
    ((select public.can('blog', 'edit')) and status = 'draft')
    or (select public.can('blog', 'publish'))
  );

create policy "Staff delete: blog delete"
  on public.tmpl_items for delete
  to authenticated
  using ((select public.can('blog', 'delete')));

revoke truncate, references, trigger on public.tmpl_items from anon, authenticated;
revoke insert, update, delete on public.tmpl_items from anon;
-- END POLICIES

-- Owner (…02) has a published row and a draft; "other" (…03) has a draft.
insert into public.tmpl_items (id, user_id, status, title) values

  ('a0000000-0000-4000-8000-00000000aa01', 'f0000000-0000-4000-8000-000000000002', 'published', 'Published'),

  ('a0000000-0000-4000-8000-00000000aa02', 'f0000000-0000-4000-8000-000000000002', 'draft', 'Owner draft'),

  ('a0000000-0000-4000-8000-00000000aa03', 'f0000000-0000-4000-8000-000000000003', 'draft', 'Other draft');


-- Runs `statement` as the current role and undoes it. True when it changed at least one row;
-- false when it changed nothing or RLS/privileges refused it.
create function tests.attempt(statement text)
returns boolean
language plpgsql
as $$
declare
  changed integer;
begin
  begin
    execute statement;
    get diagnostics changed = row_count;
    raise exception using errcode = 'P0100', message = changed::text;
  exception
    when insufficient_privilege then return false;
    when sqlstate 'P0100' then return sqlerrm::integer > 0;
  end;
end;
$$;
grant execute on function tests.attempt(text) to anon, authenticated;

create function tests.visible() returns integer language sql as $$
  select count(*)::integer from public.tmpl_items
$$;
grant execute on function tests.visible() to anon, authenticated;


-- Module on -------------------------------------------------------------------------------------
update public.modules set enabled = true where key = 'blog';

-- anon (on)
select tests.clear_claims();
set local role anon;
select is(tests.visible(), 1, 'on: anon sees 1 row');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values (auth.uid(), 'Mine')$$), false, 'on: anon cannot insert its own draft');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'on: anon cannot insert a draft for someone else');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: anon cannot edit someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: anon cannot delete someone else''s draft');
reset role;

-- a signed-in user (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000004');
set local role authenticated;
select is(tests.visible(), 1, 'on: a signed-in user sees 1 row');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values (auth.uid(), 'Mine')$$), true, 'on: a signed-in user can insert its own draft');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'on: a signed-in user cannot insert a draft for someone else');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: a signed-in user cannot edit someone else''s draft');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: a signed-in user cannot publish someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: a signed-in user cannot delete someone else''s draft');
reset role;

-- the owner (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is(tests.visible(), 2, 'on: the owner sees 2 rows');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa02'$$), true, 'on: the owner can edit its own draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa02'$$), true, 'on: the owner can delete its own draft');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa01'$$), false, 'on: the owner cannot edit its own published row');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa02'$$), false, 'on: the owner cannot publish its own draft');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: the owner cannot edit someone else''s draft');
reset role;

-- staff without permissions (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000005');
set local role authenticated;
select is(tests.visible(), 1, 'on: staff without permissions sees 1 row');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'on: staff without permissions cannot insert a draft for someone else');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff without permissions cannot edit someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff without permissions cannot delete someone else''s draft');
reset role;

-- staff with view (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000006');
set local role authenticated;
select is(tests.visible(), 3, 'on: staff with view sees 3 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'on: staff with view cannot insert a draft for someone else');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with view cannot edit someone else''s draft');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with view cannot publish someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with view cannot delete someone else''s draft');
reset role;

-- staff with create (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000007');
set local role authenticated;
select is(tests.visible(), 3, 'on: staff with create sees 3 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), true, 'on: staff with create can insert a draft for someone else');
select is(tests.attempt($$insert into public.tmpl_items (user_id, status, title) values ('f0000000-0000-4000-8000-000000000003', 'published', 'Theirs')$$), false, 'on: staff with create cannot insert a published row');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with create cannot edit someone else''s draft');
reset role;

-- staff with edit (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000008');
set local role authenticated;
select is(tests.visible(), 3, 'on: staff with edit sees 3 rows');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), true, 'on: staff with edit can edit someone else''s draft');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with edit cannot publish someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with edit cannot delete someone else''s draft');
reset role;

-- staff with publish (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000009');
set local role authenticated;
select is(tests.visible(), 3, 'on: staff with publish sees 3 rows');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), true, 'on: staff with publish can publish someone else''s draft');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'on: staff with publish cannot insert a draft for someone else');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with publish cannot delete someone else''s draft');
reset role;

-- staff with delete (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000010');
set local role authenticated;
select is(tests.visible(), 3, 'on: staff with delete sees 3 rows');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), true, 'on: staff with delete can delete someone else''s draft');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: staff with delete cannot edit someone else''s draft');
reset role;

-- inactive staff with every permission (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000011');
set local role authenticated;
select is(tests.visible(), 1, 'on: inactive staff with every permission sees 1 row');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'on: inactive staff with every permission cannot insert a draft for someone else');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: inactive staff with every permission cannot edit someone else''s draft');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: inactive staff with every permission cannot publish someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'on: inactive staff with every permission cannot delete someone else''s draft');
reset role;

-- the super admin (on)
select tests.claims_for('f0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(tests.visible(), 3, 'on: the super admin sees 3 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), true, 'on: the super admin can insert a draft for someone else');
select is(tests.attempt($$insert into public.tmpl_items (user_id, status, title) values ('f0000000-0000-4000-8000-000000000003', 'published', 'Theirs')$$), true, 'on: the super admin can insert a published row');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), true, 'on: the super admin can edit someone else''s draft');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), true, 'on: the super admin can publish someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), true, 'on: the super admin can delete someone else''s draft');
reset role;

-- Module off ------------------------------------------------------------------------------------
update public.modules set enabled = false where key = 'blog';

-- anon (off)
select tests.clear_claims();
set local role anon;
select is(tests.visible(), 0, 'off: anon sees 0 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values (auth.uid(), 'Mine')$$), false, 'off: anon cannot insert its own draft');
reset role;

-- a signed-in user (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000004');
set local role authenticated;
select is(tests.visible(), 0, 'off: a signed-in user sees 0 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values (auth.uid(), 'Mine')$$), false, 'off: a signed-in user cannot insert its own draft');
reset role;

-- the owner (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000002');
set local role authenticated;
select is(tests.visible(), 0, 'off: the owner sees 0 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values (auth.uid(), 'Mine')$$), false, 'off: the owner cannot insert its own draft');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa02'$$), false, 'off: the owner cannot edit its own draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa02'$$), false, 'off: the owner cannot delete its own draft');
reset role;

-- staff with view (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000006');
set local role authenticated;
select is(tests.visible(), 0, 'off: staff with view sees 0 rows');
reset role;

-- staff with create (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000007');
set local role authenticated;
select is(tests.visible(), 0, 'off: staff with create sees 0 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'off: staff with create cannot insert a draft for someone else');
reset role;

-- staff with edit (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000008');
set local role authenticated;
select is(tests.visible(), 0, 'off: staff with edit sees 0 rows');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'off: staff with edit cannot edit someone else''s draft');
reset role;

-- staff with publish (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000009');
set local role authenticated;
select is(tests.visible(), 0, 'off: staff with publish sees 0 rows');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'off: staff with publish cannot publish someone else''s draft');
reset role;

-- staff with delete (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000010');
set local role authenticated;
select is(tests.visible(), 0, 'off: staff with delete sees 0 rows');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'off: staff with delete cannot delete someone else''s draft');
reset role;

-- the super admin (off)
select tests.claims_for('f0000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(tests.visible(), 3, 'off: the super admin sees 3 rows');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values (auth.uid(), 'Mine')$$), false, 'off: the super admin cannot insert its own draft');
select is(tests.attempt($$insert into public.tmpl_items (user_id, title) values ('f0000000-0000-4000-8000-000000000003', 'Theirs')$$), false, 'off: the super admin cannot insert a draft for someone else');
select is(tests.attempt($$insert into public.tmpl_items (user_id, status, title) values ('f0000000-0000-4000-8000-000000000003', 'published', 'Theirs')$$), false, 'off: the super admin cannot insert a published row');
select is(tests.attempt($$update public.tmpl_items set title = 'Edited' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'off: the super admin cannot edit someone else''s draft');
select is(tests.attempt($$update public.tmpl_items set status = 'published' where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'off: the super admin cannot publish someone else''s draft');
select is(tests.attempt($$delete from public.tmpl_items where id = 'a0000000-0000-4000-8000-00000000aa03'$$), false, 'off: the super admin cannot delete someone else''s draft');
reset role;

select is((select count(*)::integer from public.tmpl_items), 3, 'no attempt changed the data');

select * from finish();
rollback;
