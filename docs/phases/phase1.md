# Phase 1: Core database, authentication, and roles

## Context

Read CLAUDE.md and docs/phases/phase-0.md first and follow every rule in CLAUDE.md. Phase 0 is complete: the app, env validation, Supabase clients, health check, testing, and CI exist.

This phase creates the core database tables, the role system, the Row Level Security helper functions every later phase will depend on, and authentication. Work through the steps in order, commit after each step, and stop at the end to report back.

## Role model

- super_admin: exactly one per deployment (me). Configures the site, enables modules, manages staff and permissions.
- staff: can use enabled modules and core areas only where they have been granted a permission.
- user: a registered visitor who can access only their own private records.
- Visitors (not signed in) see only published public content.

Roles are read from the database on every request, not stored in JWT claims, so a role change or deactivation takes effect immediately.

## Out of scope for this phase

No admin portal UI beyond a protected placeholder, no staff invite screen, no permission editing UI (Phase 2), no branding or media (Phase 3), no module features. Do not add dependencies beyond what is needed for forms (react-hook-form and @hookform/resolvers are allowed) without asking.

## Step 1: Shared database utilities migration

Create a migration with:

- A set_updated_at() trigger function for keeping updated_at current.
- Enums: app_role ('super_admin', 'staff', 'user') and permission_action ('view', 'create', 'edit', 'delete', 'publish').

All functions in every migration of this phase must set search_path = '' and use fully qualified names (public.profiles, auth.uid()).

## Step 2: Profiles migration

Create public.profiles:

- id uuid primary key referencing auth.users(id) on delete cascade
- email citext not null unique
- full_name text, avatar_url text
- role app_role not null default 'user'
- is_active boolean not null default true
- created_at, updated_at timestamptz with defaults, plus the updated_at trigger

Add a partial unique index so only one row can ever have role = 'super_admin'.

Add a security definer trigger on auth.users insert that creates the matching profile with role 'user', and a trigger on auth.users update that keeps profiles.email in sync.

Enable RLS in the same migration. Policies:

- A user can select their own profile.
- The super admin can select all profiles.
- Staff can select profiles only if they have the 'view' permission on a scope that needs it (leave a TODO comment; for now staff can select only their own).
- A user can update only full_name and avatar_url on their own row. Enforce this with column-level grants (revoke update on the table from authenticated, then grant update on only those two columns) in addition to the policy, so role, email, and is_active can never be changed by the user.
- No insert or delete policies for authenticated users; the trigger and admin functions handle those.

## Step 3: Site settings, modules, and permission scopes migration

Create:

- public.site_settings: a single-row table (id boolean primary key default true with a check that it is true), site_name text not null default 'My Site', contact_email text, updated_at, updated_by uuid referencing profiles. Insert the one row in the migration. Phase 3 will add branding columns.
- public.permission_scopes: key text primary key, label text, kind text check in ('core', 'module'), sort_order int. Seed it in the migration with core scopes 'content' (homepage and pages), 'media', and module scopes 'blog', 'photo_gallery', 'video_gallery', 'shop', 'directory', 'inventory', 'crm', 'booking', 'email_marketing'.
- public.modules: key text primary key referencing permission_scopes(key), enabled boolean not null default false, updated_at, updated_by. Seed one row per module scope, all disabled.

These seeds belong in migrations, not seed.sql, because every production client database needs them.

RLS:

- site_settings: anyone (including anon) can select; only the super admin can update.
- permission_scopes: authenticated can select; no writes except through migrations.
- modules: anyone can select (the public site needs to know what is enabled); only the super admin can update.

## Step 4: Staff permissions migration

Create public.staff_permissions:

- id uuid primary key default gen_random_uuid()
- user_id uuid referencing profiles on delete cascade
- scope text referencing permission_scopes(key)
- action permission_action
- granted_by uuid referencing profiles, created_at
- unique (user_id, scope, action)

RLS: the super admin can select, insert, and delete; staff can select only their own rows; nobody can update (revoke and re-grant instead).

## Step 5: Access helper functions migration

Create these SQL functions, all stable, security definer, search_path = '', and executable by anon and authenticated:

- public.current_app_role() returns app_role or null: the role of auth.uid() if the profile is active, otherwise null.
- public.is_super_admin() returns boolean.
- public.is_staff_or_admin() returns boolean: true for active staff or the super admin.
- public.module_enabled(scope_key text) returns boolean: true for core scopes; for module scopes, the enabled value in public.modules.
- public.has_permission(scope_key text, act permission_action) returns boolean: true for the super admin; for active staff, true if a matching staff_permissions row exists; false otherwise.
- public.can(scope_key text, act permission_action) returns boolean: module_enabled(scope_key) and has_permission(scope_key, act). This is the function future module policies will call for staff writes.

In policies, always call these as (select public.is_super_admin()) and similar, so Postgres evaluates them once per statement instead of once per row. Add a comment block at the top of the migration explaining the three checks every later policy must combine: module status (module_enabled or can), role permission (has_permission or can), and record ownership (owner column = auth.uid()). Write one example policy in comments showing the pattern for a future user-owned table such as orders.

## Step 6: Admin functions and audit log migration

Create public.audit_log: id bigint generated always as identity, actor_id uuid, action text not null, scope text, target_table text, target_id text, metadata jsonb default '{}', created_at. RLS: only the super admin can select; no direct insert, update, or delete for anyone.

Create security definer functions:

- public.log_audit(action, scope, target_table, target_id, metadata): inserts a row with actor_id = auth.uid(). Revoke execute from anon.
- public.set_user_role(target_user uuid, new_role app_role): super admin only; cannot change the super admin's own role; cannot assign 'super_admin' (there is only one, created by bootstrap); writes an audit entry.
- public.set_user_active(target_user uuid, active boolean): super admin only; cannot deactivate the super admin; writes an audit entry.
- public.set_module_enabled(module_key text, enabled boolean): super admin only; updates modules and writes an audit entry.

Raise clear exceptions with readable messages when a rule is violated.

## Step 7: Types and local seed

- Regenerate src/core/supabase/database.types.ts.
- In supabase/seed.sql (local development only), create three test users through the auth schema: a super admin, a staff member with 'view' and 'edit' on 'content', and a regular user. Document their emails and passwords in the README under "Local test accounts". Never run seed.sql against a client database.

## Step 8: Server-side auth helpers

In src/core/auth/ create:

- getCurrentUser(): uses the server Supabase client and a verified method (getUser or getClaims, whichever current Supabase docs recommend for trusted server checks), never an unverified session read.
- getCurrentProfile(): returns the profile for the current user, wrapped in React cache() so it runs once per request. Returns null if not signed in or inactive.
- requireUser(), requireStaffOrAdmin(), requireSuperAdmin(): redirect to sign-in if not signed in, and to a "not authorized" page if the role is wrong. These are temporary; Phase 2 will add the full requireAccess({ scope, action }) guard built on the SQL helpers.
- If a signed-in user's profile is inactive, sign them out and show a message that the account is disabled.

## Step 9: Super admin bootstrap

When a user signs in (in the auth callback and after password sign-in), if all of these are true, promote them to super_admin using the admin client:

- env SUPER_ADMIN_EMAIL is set and matches their email (case-insensitive)
- their email is confirmed
- no super admin exists yet

The unique partial index protects against races. Write an audit entry for the bootstrap. If a super admin already exists, do nothing and never demote anyone. Make SUPER_ADMIN_EMAIL required in env.ts from this phase on.

## Step 10: Authentication pages

Build these in the public route group using shadcn components, react-hook-form, and Zod, styled with the theme tokens and matching the look of docs/design/ (clean, centered card, eyebrow label, accent button):

- /sign-in: email and password, plus a "Email me a sign-in link" option (magic link)
- /sign-up: name, email, password with a strength requirement
- /forgot-password and /reset-password
- /auth/confirm route handler that verifies the token_hash and type from email links, then redirects
- /auth/callback route handler for any code-exchange flows
- /sign-out as a server action
- /account: a signed-in user's page showing their email and an editable full name (the only self-editable field besides avatar for now)
- /not-authorized

Rules:

- Error messages never reveal whether an email is registered.
- Only allow redirects to internal paths (validate any "next" parameter).
- After sign-in, send the super admin and staff to /admin and regular users to /account.
- The /admin layout calls requireStaffOrAdmin(). The placeholder dashboard shows the signed-in user's name and role.
- Add a small signed-in/signed-out indicator in the public placeholder header linking to sign-in, account, or admin as appropriate.

## Step 11: Tests

- Set up database tests with supabase test db (pgTAP) in supabase/tests/. Cover at least:
  - a user can read only their own profile and cannot update role, email, or is_active
  - the super admin can read all profiles
  - a second super_admin cannot exist
  - staff can read only their own permissions; users can read none
  - only the super admin can update modules and site_settings; anon can read both
  - audit_log cannot be inserted into directly by anyone
  - has_permission and can return correct results for each role, including a disabled module and an inactive staff member
  - set_user_role and set_user_active reject non-super-admins and the forbidden cases
- Vitest: the "next" redirect validator and the bootstrap decision logic (pure function).
- Playwright: sign up, confirm the email through the local Supabase mail viewer, sign in, land on /account; sign in as the seeded super admin and land on /admin; a regular user visiting /admin gets /not-authorized.
- Add supabase test db to CI using the Supabase CLI with a local database.

## Step 12: Documentation

- Update CLAUDE.md: add the role model, the table list, the helper functions and when to use each, the policy pattern (module status + permission + ownership), the rule that every future user-owned table has an owner column named user_id referencing profiles, and update "Current state."
- Write docs/phases/phase-1.md.
- In README.md, add a "Supabase Auth configuration per client" checklist: site URL and redirect URLs (including the Vercel preview URL pattern), custom SMTP using Resend, email templates updated to use the token_hash confirm link, and setting SUPER_ADMIN_EMAIL.

## Done when

- All migrations apply cleanly on a fresh database with supabase db reset.
- Signing up with SUPER_ADMIN_EMAIL and confirming makes that account the super admin; any other signup becomes a user.
- Regular users cannot reach /admin, cannot read other profiles, and cannot change their own role, even with direct Supabase API calls from the browser.
- All pgTAP, unit, and e2e tests pass locally and in CI, along with lint, typecheck, and build.
- CLAUDE.md, README.md, and docs/phases/phase-1.md are updated.

When finished, report: what was built, any deviations and why, the manual Supabase dashboard steps I need to do for each client project, and any env var changes.
