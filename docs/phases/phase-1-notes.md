# Phase 1 notes: Core database, authentication, and roles

**Status:** complete (2026-09-29). Brief: [phase-1.md](phase-1.md).

## What was built

| Step | Result                                                                                                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `20260929120000_shared_utilities.sql`: `set_updated_at()`, enums `app_role`, `permission_action`.                                                                                                                                       |
| 2    | `20260929120100_profiles.sql`: `profiles`, single-super-admin partial unique index, auth insert and email-change triggers, `current_app_role()`, `is_super_admin()`, RLS + column grants (users update only `full_name`, `avatar_url`). |
| 3    | `20260929120200_site_settings_scopes_modules.sql`: `site_settings` (single row), `permission_scopes` (2 core + 9 module scopes), `modules` (all disabled), `set_updated_by()` trigger, RLS.                                             |
| 4    | `20260929120300_staff_permissions.sql`: grants table, RLS (super admin manages; active staff read own; no updates).                                                                                                                     |
| 5    | `20260929120400_access_helpers.sql`: `is_staff_or_admin`, `module_enabled`, `has_permission`, `can`, and the policy-pattern comment block with an `orders` example.                                                                     |
| 6    | `20260929120500_audit_log_admin_functions.sql`: `audit_log` (append-only), `log_audit`, `set_user_role`, `set_user_active`, `set_module_enabled`.                                                                                       |
| 7    | Regenerated `database.types.ts`; `supabase/seed.sql` local accounts; README "Local test accounts".                                                                                                                                      |
| 8    | `src/core/auth/`: `getCurrentUser` (getClaims), `getCurrentProfile` (cached, DB role), `requireUser` / `requireStaffOrAdmin` / `requireSuperAdmin`, `/auth/disabled` sign-out route.                                                    |
| 9    | `20260929120600_bootstrap_super_admin.sql` + `shouldBootstrapSuperAdmin()` / `maybeBootstrapSuperAdmin()`; `SUPER_ADMIN_EMAIL` required.                                                                                                |
| 10   | Sign-in (password + magic link), sign-up, forgot/reset password, account, not-authorized pages; `/auth/confirm`, `/auth/callback`; `signOut`; header indicator; `/admin` guarded. Local auth config and email templates.                |
| 11   | 115 pgTAP assertions (4 files), Vitest for the redirect validator and bootstrap decision, Playwright auth flows, CI job with local Supabase.                                                                                            |
| 12   | CLAUDE.md, README (auth configuration checklist), these notes.                                                                                                                                                                          |

## Decisions and deviations

- **`current_app_role()` and `is_super_admin()` live in the profiles migration**, not the
  access-helpers migration. The profiles policies (step 2) and the site settings, modules, and
  staff-permission policies (steps 3 and 4) call `is_super_admin()`, so it has to exist first.
  The access-helpers migration documents all six helpers.
- **Inactive users can still read their own profile.** That lets the app tell "deactivated"
  apart from "signed out" and sign them out with a message. They cannot update it, and every
  helper treats them as having no role.
- **Demoting staff (`set_user_role` to `user`) deletes their grants**, recorded in the audit
  metadata, so a later re-promotion never silently restores old access.
- **`set_updated_by()` trigger** (not in the brief) stamps `updated_by` on `site_settings` and
  `modules` from `auth.uid()`.
- **`bootstrap_super_admin()` is a service_role-only SQL function.** The app makes the decision
  (`shouldBootstrapSuperAdmin`, unit tested), and the database re-checks everything: no super
  admin exists, the email matches, the email is confirmed, and the account is active. It writes
  the audit row itself because no `auth.uid()` exists in a service_role call. `audit_log` has no
  direct write access for anyone, including service_role.
- **`getClaims()`** is used for `getCurrentUser()`, as current Supabase docs recommend. It verifies
  the JWT signature against the project's signing keys (asymmetric locally and on new projects).
- **All sign-in paths share `finishSignIn()`** (password, magic link, email confirmation, PKCE
  callback): bootstrap, deactivated check, then redirect. Bootstrap errors are logged and never
  block sign-in.
- **Magic links use `shouldCreateUser: false`** and always report success, so they cannot be used
  to create accounts or discover registered emails.
- **The app-level `loading.tsx` moved to `src/app/(admin)/admin/loading.tsx`.** At the app root
  it wrapped every layout in a Suspense boundary, so guard redirects were streamed (HTTP 200 plus
  a client-side redirect) instead of real 307s. Inside the admin segment it sits below the
  guarded layout. Any future `loading.tsx` must stay below guards.
- **The `/admin` page repeats `requireStaffOrAdmin()`**, because layouts are not re-run on every
  client-side navigation.
- **Public pages are now dynamic**, because the placeholder header reads the session.
- **`/sign-out` is a server action** (`signOut` in `src/core/auth/actions.ts`), used by forms in
  both headers, rather than a route.
- **E2E runs a production build on port 3100 against local Supabase.** Next.js 16 allows only one
  `next dev` per project, so this works alongside a running dev server. `playwright.config.ts`
  reads the local keys from `supabase status`, and `SUPER_ADMIN_EMAIL` is `owner@example.test` in
  tests.
- **Local Supabase config**: email confirmations on, password policy (10+, mixed case, digit),
  `email_sent` rate limit raised to 1000/hour so repeated e2e runs are not throttled (local only),
  redirect URLs for ports 3000 and 3100, and token_hash email templates in `supabase/templates/`.
- **Local Docker runtime: Colima** (installed with Homebrew), since no Docker was installed.
- **`db:types` runs Prettier** on the generated file (the CLI output is unformatted), and CI fails
  if the committed types drift from the migrations.
- **Added shadcn `field`** (component source, no new dependency) plus small shared form helpers
  (`FormTextField`, `FormMessage`, `Eyebrow`).
- **Phase doc naming**: briefs are `phase-N.md` and notes are `phase-N-notes.md` (the Phase 0 files
  were renamed to match).

## Verified locally

- `supabase db reset` applies all migrations and the seed on a fresh database.
- `pnpm test:db`: 115/115 pgTAP assertions pass.
- `pnpm test`: 25 unit tests pass. `pnpm test:e2e`: 14 tests pass (desktop and mobile).
- Signing up with `SUPER_ADMIN_EMAIL` and confirming made that account the super admin, with an
  audit entry. Other sign-ups became users. A duplicate sign-up showed the same message as a new
  one.
- A regular user gets `/not-authorized` for `/admin`; signed-out requests to `/admin`,
  `/account`, and `/reset-password` get 307 redirects to sign-in.
- lint, typecheck, format:check, and build pass.
