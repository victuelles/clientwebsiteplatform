# Phase 2 notes: Access control layer and admin shell

**Status:** complete (2026-09-29). Brief: [phase-2.md](phase-2.md).

## What was built

| Step | Result                                                                                                                                                                                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `20260929130000_access_control_functions.sql`: `get_my_permissions()`, `set_staff_permissions()`, `admin_list_staff()`; the `set_user_role` demotion rule documented. 33 new pgTAP assertions.                                                                                    |
| 2    | `src/core/access/scopes.ts` (scopes and actions, typed from the generated types) + `scopes.int.test.ts`, which fails if the code and the database drift (`pnpm test:int`).                                                                                                        |
| 3    | `decide.ts` (pure `decideAccess`, `decideRole`, `decide`), `context.ts` (`getAccessContext`), `guard.ts` (`requireAccess`, `requireSuperAdmin`, `requireStaffOrAdmin`, `requireUser`), `protected-action.ts`, `protected-route.ts`, `origin.ts`; proxy optimistic `/admin` check. |
| 4    | `PermissionsProvider` + `usePermissions()`, using the same `decide()` as the server. UI hiding only.                                                                                                                                                                              |
| 5    | Admin shell (shadcn sidebar, navy, coral active state, icon collapse, mobile sheet), server-filtered nav, `AdminPageHeader` breadcrumbs, dashboard, guarded placeholders.                                                                                                         |
| 6    | `/admin/staff` list + invite dialog (with promote-existing-user), `/admin/staff/[id]` (permission matrix, deactivate/reactivate, demote, resend invite), `/auth/set-password`.                                                                                                    |
| 7    | `/admin/audit`: server-side pagination, actor/scope/date filters in the URL, metadata drawer.                                                                                                                                                                                     |
| 8    | Unit tests (77 in total), pgTAP (148), integration (2), e2e (25 run + 5 desktop-only skips on mobile).                                                                                                                                                                            |
| 9    | CLAUDE.md "How to protect things" and current state, README invite template, these notes.                                                                                                                                                                                         |

## Decisions and deviations

- **`set_user_role` already deleted grants on demotion** (since Phase 1, for any move away from
  staff). It was not rewritten. The migration restates the rule in the function comment, and a
  pgTAP test now covers it.
- **Added `admin_list_staff()`** (not in the brief). The staff table needs invite state and last
  sign-in from `auth.users`. A super-admin-only SQL function provides them without using the admin
  client for page reads.
- **`set_staff_permissions` writes no audit entry when nothing changed.** Each real change writes
  exactly one entry with `added` and `removed`. Input validation found a real bug during testing:
  `jsonb_typeof(null) <> 'string'` is null rather than true, so a missing `action` slipped
  through. The check now uses `is distinct from`.
- **`requireAccess` returns `{ context, moduleDisabled }`.** A guard function cannot render
  anything, so for the super admin on a disabled module the page renders
  `<ModuleDisabledNotice scope=... />` when `moduleDisabled` is true. Staff get `notFound()`. The
  pattern is documented in CLAUDE.md.
- **Requirements are `{ scope, action }` or `{ role }`,** where the role is `super_admin`,
  `staff_or_admin`, or `signed_in`. This lets `protectedAction` and `protectedRoute` guard
  super-admin areas, the account page, and password setup with the same machinery. The public
  auth actions (sign-in, sign-up, magic link, reset request) are the only unguarded actions.
- **Decision order**: signed in → active → staff/super admin → known scope → module enabled →
  permission. Staff without a grant on a disabled module get a 404 (the module "does not
  exist"), not /not-authorized.
- **Access checks run before input validation** in `protectedAction`, so forbidden callers never
  learn about validation rules. `toActionError()` passes through only the readable messages our
  SQL functions raise (codes 42501, 22023, P0002). Everything else becomes a generic message.
- **The proxy sets an `x-pathname` request header,** so guards can send signed-out users to
  sign-in with the right `next` without each page passing its path.
- **Removed `src/app/(admin)/admin/loading.tsx`.** Its Suspense boundary sat above every admin
  page's own guard, which turned page-level redirects into streamed 200 responses (the same
  problem as the root `loading.tsx` in Phase 1). Real 307s are more important than a skeleton.
- **`use-mobile.ts` (generated by shadcn) was rewritten** with `useSyncExternalStore`. The
  generated version failed the React Compiler lint rule about calling setState inside an effect.
- **Module nav items link to `/admin/<module-key>`** (for example `/admin/photo-gallery`). The pages
  arrive with each module. Every module is disabled today, so none of these links appear.
- **Staff can only be granted permissions while they are staff.** Invites create the auth user,
  then call `set_user_role(staff)` with the super admin's own session (not the admin client). The
  admin client is used only for `inviteUserByEmail`.
- **Times in the audit log and staff pages are shown in UTC** (and labeled). This matches the
  date filters and avoids a hydration mismatch between server and browser time zones.
- **Integration tests** (`*.int.test.ts`) have their own Vitest config and run in the CI database
  job. `pnpm test` stays database-free.
- **Owner-written phase briefs are excluded from Prettier**, so they are never reformatted.

## Manual Supabase settings (per client)

- **Invite user email template**: set the link to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` (see
  `supabase/templates/invite.html`). Without it, invitations from `/admin/staff` do not work.
- **Redirect URLs**: the existing `https://<client-domain>/**` entry covers
  `/auth/set-password`. There is nothing new to add if that pattern is present.
- Invitations are sent through the project's SMTP settings (Resend, from the Phase 1 checklist).

## Verified locally

- pgTAP 148/148, unit 77/77, integration 2/2, and e2e 25/25 pass (the staff lifecycle runs on
  desktop). lint, typecheck, format:check, and build pass.
- Staff with content view/edit see only Dashboard and Content. `/admin/staff`, `/admin/audit`,
  `/admin/media`, `/admin/settings`, and `/admin/modules` return 307 to `/not-authorized`.
  Replaying the save-permissions server action as that staff member returns "You don't have
  permission to do that." and changes nothing.
- Invite, grant, resend, promote an existing user, demote, and deactivate each produce the
  expected audit entries. A deactivated staff member is signed out on their next request.
