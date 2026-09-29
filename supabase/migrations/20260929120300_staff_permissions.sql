-- Staff permissions: which actions a staff member may perform on which scope.
-- Rows are never updated; revoke (delete) and re-grant (insert) instead.

create table public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null references public.permission_scopes (key) on delete cascade,
  action public.permission_action not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, scope, action)
);

comment on table public.staff_permissions is 'Per-scope action grants for staff members.';

create index staff_permissions_scope_idx on public.staff_permissions (scope);

alter table public.staff_permissions enable row level security;

create policy "Super admin can read all staff permissions"
  on public.staff_permissions for select
  to authenticated
  using ((select public.is_super_admin()));

-- Only active staff see their own grants; regular users see none.
create policy "Staff can read their own permissions"
  on public.staff_permissions for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.current_app_role()) = 'staff'
  );

create policy "Super admin can grant permissions"
  on public.staff_permissions for insert
  to authenticated
  with check (
    (select public.is_super_admin())
    and granted_by = (select auth.uid())
  );

create policy "Super admin can revoke permissions"
  on public.staff_permissions for delete
  to authenticated
  using ((select public.is_super_admin()));

-- No update policy and no update grant: nobody updates a grant.
revoke update, truncate, references, trigger on public.staff_permissions from anon, authenticated;
revoke insert, delete on public.staff_permissions from anon;
