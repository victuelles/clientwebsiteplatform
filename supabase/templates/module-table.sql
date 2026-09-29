-- Module table template: the standard RLS pattern every module table follows.
--
-- `pnpm module:new <key>` copies this into a new migration with __module__ replaced by the module
-- key and __table__ by a table name (<key>_items). Keep only the parts your table needs:
--   - public content (posts, products): keep "Public read"; drop the owner parts if users never
--     own rows.
--   - private user records (orders, bookings): keep the owner parts; drop "Public read".
-- supabase/tests/database/08_module_policy_template.test.sql applies the POLICIES block below to a temporary
-- table and checks every role with the module on and off (a unit test keeps the two in sync).
--
-- Rules (CLAUDE.md, "How to build a module"):
--   * Wrap every helper in (select ...) so Postgres evaluates it once per statement.
--   * can() includes module_enabled(), so staff and super admin writes stop while the module is
--     off; owner writes check module_enabled() themselves. Nobody writes to a disabled module.
--   * The super admin keeps read-only access while the module is off (select only).
--   * Index user_id and every column used in a policy (status here).

create table public.__table__ (
  id uuid primary key default gen_random_uuid(),
  -- Owner (Rule 4). Drop for content that only staff create.
  user_id uuid not null references public.profiles (id),
  status text not null default 'draft' check (status in ('draft', 'published')),
  title text not null check (char_length(title) between 1 and 200),
  -- TODO: the module's columns.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.__table__ is 'TODO: describe the table.';

create index __table___user_id_idx on public.__table__ (user_id);
create index __table___status_idx on public.__table__ (status);

create trigger __table___set_updated_at
  before update on public.__table__
  for each row execute function public.set_updated_at();

-- BEGIN POLICIES
alter table public.__table__ enable row level security;

create policy "Public read: published rows while __module__ is on"
  on public.__table__ for select
  to anon, authenticated
  using (status = 'published' and (select public.module_enabled('__module__')));

create policy "Owner read: own rows while __module__ is on"
  on public.__table__ for select
  to authenticated
  using (user_id = (select auth.uid()) and (select public.module_enabled('__module__')));

create policy "Staff read: __module__ view"
  on public.__table__ for select
  to authenticated
  using ((select public.can('__module__', 'view')));

create policy "Super admin read: also while __module__ is off"
  on public.__table__ for select
  to authenticated
  using ((select public.is_super_admin()));

create policy "Owner insert: own drafts while __module__ is on"
  on public.__table__ for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('__module__'))
  );

create policy "Owner update: own drafts while __module__ is on"
  on public.__table__ for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('__module__'))
  )
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('__module__'))
  );

create policy "Owner delete: own drafts while __module__ is on"
  on public.__table__ for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
    and (select public.module_enabled('__module__'))
  );

create policy "Staff insert: __module__ create (publish to insert published rows)"
  on public.__table__ for insert
  to authenticated
  with check (
    (select public.can('__module__', 'create'))
    and (status = 'draft' or (select public.can('__module__', 'publish')))
  );

create policy "Staff update: __module__ edit (publish to set or keep published)"
  on public.__table__ for update
  to authenticated
  using ((select public.can('__module__', 'edit')) or (select public.can('__module__', 'publish')))
  with check (
    ((select public.can('__module__', 'edit')) and status = 'draft')
    or (select public.can('__module__', 'publish'))
  );

create policy "Staff delete: __module__ delete"
  on public.__table__ for delete
  to authenticated
  using ((select public.can('__module__', 'delete')));

revoke truncate, references, trigger on public.__table__ from anon, authenticated;
revoke insert, update, delete on public.__table__ from anon;
-- END POLICIES
