# Phase 2: Access control layer and admin shell

## Context

Read CLAUDE.md, docs/phases/phase-0.md, and docs/phases/phase-1.md first and follow every rule in CLAUDE.md. Phase 1 is complete: profiles, roles, site_settings, permission_scopes, modules, staff_permissions, audit_log, the SQL helper functions (is_super_admin, is_staff_or_admin, module_enabled, has_permission, can), the super admin bootstrap, and the auth pages all exist.

This phase builds the single access guard every later phase will use, the admin portal shell with permission-aware navigation, staff management with a permission matrix, and the audit log viewer. Work through the steps in order, commit after each step, and stop at the end to report back.

## Core principle

Every request is checked three ways: module status, role permission, and record ownership. The app-side guard in this phase checks module status and role permission before any work happens. RLS in the database enforces the same rules plus ownership, so a bug in app code can never expose data. UI hiding is a convenience only and is never treated as security.

## Out of scope for this phase

No branding or media screens (Phase 3), no homepage editor (Phase 4), no working module toggle screen or module registry (Phase 5), no module features. Placeholder pages are fine where the nav needs a destination. You may add shadcn components as needed (sidebar, table, checkbox, dialog, alert-dialog, badge, avatar, breadcrumb, tooltip, tabs, select, switch, pagination). Ask before adding any other dependency.

## Step 1: Database additions migration

Create a migration with these security definer functions (search_path = '', fully qualified names, audit entries for every change):

- public.get_my_permissions(): returns the current user's effective permissions as rows of (scope, action). For the super admin, return every scope and action. For active staff, return their staff_permissions rows. For everyone else, return nothing.
- public.set_staff_permissions(target_user uuid, permissions jsonb): super admin only. Takes an array of { scope, action } objects and atomically replaces all of that user's permissions in one transaction. Rejects unknown scopes, rejects targets who are not staff, and writes one audit entry containing the added and removed permissions.
- Update public.set_user_role so that changing a staff member to 'user' deletes all their staff_permissions in the same transaction.

Add pgTAP tests for each function, including rejection cases.

## Step 2: Scope registry in code

Create src/core/access/scopes.ts that lists every permission scope (key, label, kind, sort order) and every action, matching the permission_scopes table exactly. Add a test that queries the local database and fails if the code list and the table ever drift apart. Later phases will extend this into the full module registry in Phase 5, so keep it simple and typed.

## Step 3: The access guard

In src/core/access/ create:

- A pure function decideAccess({ profile, permissions, moduleEnabled, scope, action }) that returns one of: allowed, unauthenticated, inactive, forbidden, module_disabled. All decision logic lives here so it can be unit tested without a database.
- getAccessContext(): loads the current profile, effective permissions (from get_my_permissions), and module states in as few queries as possible, wrapped in React cache() so it runs once per request.
- requireAccess({ scope, action }) for server components and pages: redirects to sign-in when unauthenticated, shows the disabled-account message when inactive, redirects to /not-authorized when forbidden, and when the module is disabled calls notFound() for staff but renders a "This module is turned off" notice for the super admin.
- protectedAction({ scope, action, schema, audit, handler }) for server actions: checks access, validates input with the Zod schema, runs the handler, optionally writes an audit entry, and returns a typed result: { ok: true, data } or { ok: false, error, fieldErrors }. It never throws raw errors to the client and never leaks internal messages.
- protectedRoute({ scope, action }, handler) for route handlers: returns 401, 403, or 404 JSON responses matching the decision, and rejects mutating requests whose Origin header does not match NEXT_PUBLIC_SITE_URL.
- requireSuperAdmin() stays for super-admin-only areas (settings, staff, modules, audit log), now built on the same access context.

Replace the temporary requireStaffOrAdmin checks from Phase 1 with the new guard wherever it applies. The /admin layout still requires staff or super admin; individual pages add requireAccess for their scope.

Also add a cheap optimistic check in the middleware/proxy that redirects to sign-in if there is no session cookie on /admin paths. Document that this is only a speed optimization; the real checks are the guard and RLS.

## Step 4: Client-side permission context

Create a PermissionsProvider that the admin layout fills from the server with the user's role, effective permissions, and module states, plus a usePermissions() hook with helpers like can(scope, action). Use it only to hide buttons and nav items. Add a code comment and a CLAUDE.md note that it is never used for security.

## Step 5: Admin shell

Build the admin portal layout using the shadcn sidebar component and the theme tokens, visually consistent with docs/design/ (navy for the sidebar or header, accent for active states and primary buttons):

- Desktop: collapsible sidebar with logo area and site name from site_settings, grouped navigation, and a footer with the signed-in user's name, role badge, and a menu with Account, View site, and Sign out.
- Mobile: top bar with a menu button that opens the sidebar as a sheet. Test at 390px.
- Breadcrumbs and a page title area on every admin page.
- Navigation is built server-side from a nav config and filtered by the access context:
  - Dashboard: all staff and the super admin
  - Content (homepage and pages) and Media: shown if the user has 'view' on that core scope
  - One item per module scope: shown only if the module is enabled and the user has 'view' on it (all modules are disabled right now, so none will show yet; that is expected)
  - Super admin only: Modules, Staff, Settings, Audit log
- Placeholder pages for Content, Media, Modules, and Settings, each protected with the correct guard and saying which phase will build them.
- Dashboard: a welcome message, the user's role, a list of the areas they can access, and the health status from Phase 0.

## Step 6: Staff management (super admin only)

Build /admin/staff:

- A table of staff members with name, email, status (active, inactive, invited but not yet accepted), number of permissions, and last sign-in if available.
- Invite staff: a dialog with name and email. Use the admin client to send a Supabase invite whose link goes through /auth/confirm to a new /auth/set-password page, then call set_user_role to make them staff. If the email already belongs to a registered user, offer to promote them to staff instead.
- Staff detail page /admin/staff/[id]: profile info, a permission matrix with scopes as rows and actions as columns using checkboxes, "select all" per row, and a note beside each module scope showing whether that module is currently enabled. Saving sends the whole matrix to set_staff_permissions through a protectedAction. Show unsaved-changes state and a success toast.
- Actions on the detail page: deactivate or reactivate, demote to regular user (with a confirmation dialog explaining that all permissions will be removed), and resend invite for pending invites.
- The super admin cannot edit, deactivate, or demote themselves anywhere in the UI, and the database functions already reject it.

Build /auth/set-password for invited users to choose a password, reusing the password rules from sign-up.

## Step 7: Audit log viewer (super admin only)

Build /admin/audit: a paginated table with time, actor name, action, scope, and target, with filters for actor, scope, and date range, and a detail drawer showing the metadata JSON in a readable format. Server-side pagination only.

## Step 8: Tests

- Vitest: decideAccess for every combination of role (anon, user, inactive staff, staff with and without the permission, super admin) against enabled and disabled modules and core scopes.
- Vitest: protectedAction returns fieldErrors for invalid input and a generic error for forbidden calls.
- pgTAP: the new functions from Step 1.
- Playwright:
  - The super admin invites a staff member, grants 'view' and 'edit' on 'content', and the staff member accepts the invite, sets a password, signs in, and sees only Dashboard and Content in the nav.
  - That staff member visiting /admin/staff, /admin/audit, or /admin/media directly gets /not-authorized.
  - The staff member calling the save-permissions server action directly is rejected.
  - A regular user cannot reach any /admin page.
  - The admin shell works at 390px (menu opens, nav items reachable).
  - Deactivating the staff member signs them out on their next request.

## Step 9: Documentation

- Update CLAUDE.md with a "How to protect things" section showing short usage patterns for: a protected admin page, a protectedAction, a protectedRoute, and a matching RLS policy using can() and ownership. State that every new admin page, server action, and route handler must use these and nothing else. Update "Current state."
- Write docs/phases/phase-2.md.

## Done when

- Every admin page, server action, and route handler goes through the guard; a search of the codebase finds no ad hoc role checks.
- A staff member sees and can use only what they were granted, and direct URL or action calls outside their permissions are rejected by the app and by RLS.
- The super admin can invite, grant, revoke, deactivate, and demote staff, and every change appears in the audit log.
- The admin shell works well at mobile and desktop widths.
- All tests pass locally and in CI, along with lint, typecheck, and build.

When finished, report: what was built, any deviations and why, any new manual Supabase settings (such as invite email templates and the set-password redirect URL), and anything I should test by hand.
