# Phase 5: Module framework

## Context
Read CLAUDE.md and docs/phases/phase-0.md through phase-4.md first and follow every rule in CLAUDE.md. Phases 0 to 4 are complete: foundation, roles and auth, the access guard, branding and media, and the page system with sections, menus, and the FeedProvider interface.

This phase builds the framework every optional module will plug into: a typed module registry, module manifests for all nine modules, the super admin module switches screen with dependency and integration checks, a standard RLS policy pattern for module tables, consistent disabled behavior across the whole app, and a scaffold script for starting a new module. No real module features are built here; Phase 6 (blog) will be the first module built on this framework.

Work through the steps in order, commit after each step, and stop at the end to report back.

## Disabled module behavior (the rule this phase enforces everywhere)
When a module is disabled:
- Its public routes return the site's 404 page.
- Its admin nav items, admin pages, and account page links disappear for staff and users. The super admin can still open its admin pages, which show a "This module is turned off" notice and the module's data read-only.
- Its homepage sections and feed items are skipped on the public site, its section types are hidden from the "Add section" dialog, and menu and button links pointing to it are hidden.
- All creates, updates, and deletes are blocked for everyone, including the super admin, in both the app and RLS.
- Its data is never deleted or changed.
Re-enabling the module restores everything exactly as it was.

## Out of scope for this phase
No module features, tables, or real public pages. Each module gets only a manifest and placeholder pages. Do not add new dependencies without asking.

## Step 1: Module manifest type and registry
Create src/core/modules/types.ts defining a ModuleManifest with:
- key (matching the permission_scopes and modules keys), label, description, icon (lucide key)
- actions: the subset of permission actions this module uses (for example the directory may not need 'publish')
- publicRoutes: base paths the module owns (for example ['/blog'])
- adminNav: items with label, href, icon, and the action required to see each
- accountNav: items for the signed-in user's account area (for example "My orders"), each with label and href
- sectionTypes: keys of any page section types the module contributes
- feedProviders: FeedProvider implementations the module registers (from Phase 4)
- requiresModules: modules that must be enabled first (hard dependencies)
- worksWithModules: modules it integrates with when both are enabled (soft, informational)
- requiredIntegrations: any of 'stripe', 'resend', 'mux' that must be configured
- optionalIntegrations: integrations that unlock extra features
- settingsSchema: an optional Zod schema with field metadata for module settings, reusing the Phase 4 form generator
- getDataSummary: an optional server function returning counts shown in the disable dialog (for example "14 posts, 3 drafts")
- getHealth: an optional server function returning warnings, such as a required integration that was configured when the module was enabled but is now missing

Create src/core/modules/registry.ts that imports every module's manifest from src/modules/<key>/module.ts and exports helpers: getModule(key), listModules(), getEnabledModules() (cached with a "modules" tag), reserved public paths, admin nav items, account nav items, section types by module, and feed providers. Core code accesses modules only through this registry, never by importing module folders directly.

Add a validation function, run in a unit test and at build time, that checks: unique keys, keys matching the scope list from Phase 2, no two modules owning the same public path, every requiresModules key exists, and no dependency cycles.

## Step 2: Manifests for all nine modules
Create src/modules/<key>/module.ts for blog, photo_gallery, video_gallery, shop, directory, inventory, crm, booking, and email_marketing, with these relationships:
- blog: public /blog; feed provider placeholder (real provider in Phase 6)
- photo_gallery: public /gallery
- video_gallery: public /videos; requires integration 'mux'
- crm: no public routes
- email_marketing: requires module 'crm'; requires integration 'resend'
- shop: public /shop, /cart, /checkout; account nav "My orders"; requires integration 'stripe'; works with 'inventory' and 'crm'
- inventory: no public routes; works with 'shop'
- booking: public /booking; account nav "My bookings"; optional integration 'stripe' (for deposits); works with 'crm'
- directory: public /directory; account nav "My listings"

Each module gets:
- A placeholder admin page at /admin/m/<key> protected with requireAccess({ scope: key, action: 'view' }), saying which phase builds it.
- A placeholder public page at each public route that says "Coming soon" styled like the site, served only when the module is enabled.
- Placeholder account pages for accountNav items.

Replace the module paths in src/core/pages/reserved-slugs.ts with paths derived from the registry, keeping the core reserved slugs as they are. Extend the Phase 2 scope drift test so it also checks the registry against the modules table.

## Step 3: Database migration
- Add to public.modules: settings jsonb not null default '{}', enabled_at, disabled_at, enabled_by.
- Create public.module_dependencies (module_key, requires_key), seeded from the relationships above (only email_marketing requires crm for now), and a test that keeps it in sync with the manifests.
- Update public.set_module_enabled so that it refuses to enable a module whose required modules are disabled, refuses to disable a module while an enabled module depends on it, sets the timestamps and enabled_by, and writes an audit entry. Error messages must name the blocking modules.
- Create public.update_module_settings(module_key, settings jsonb): super admin only, writes an audit entry with the changed keys. The app validates settings with the manifest's Zod schema before calling it.

Integration requirements are checked in the app (Step 5), since keys live in environment variables.

## Step 4: Standard RLS policy pattern for module tables
Document and implement the policy pattern every module table must follow. Add it to CLAUDE.md and as a commented template in supabase/templates/module-table.sql:
- Public read (for published public content): module_enabled('<key>') and the row is published.
- Owner read (for private user records such as orders): module_enabled('<key>') and user_id = auth.uid().
- Staff read: can('<key>', 'view').
- Super admin read while disabled: is_super_admin(), for select only.
- Owner writes (where a module allows users to create or edit their own records): module_enabled('<key>') and user_id = auth.uid(), plus any status rules the module needs.
- Staff and super admin writes: can('<key>', 'create' / 'edit' / 'delete' / 'publish'). Because can() includes module_enabled, writes are blocked for everyone while the module is disabled.
- Always wrap helper calls in (select …) for performance, and index user_id and any status column used in policies.

Webhooks and server tasks that use the admin client bypass RLS, so add a requireModuleEnabled(key) helper for them and document the rule: webhook handlers may still record events for records that already exist (for example a payment for an order created before the module was disabled) but must never start new operations while the module is disabled. Each module phase documents how it applies this.

Add pgTAP tests that create a temporary table inside the test transaction, apply the template policies for a module key, and verify every role (anon, user, owner, staff with and without each permission, inactive staff, super admin) with the module enabled and disabled.

## Step 5: App-wide enforcement
- Public routes: add requireModulePublic(key) that returns notFound() when disabled, and use it in every module's public layout.
- Admin: the sidebar builds its module items from the registry, filtered by enabled state and permissions, replacing the placeholder module items from Phase 2. requireAccess already handles the super admin's disabled notice; make that notice show read-only data for module pages and hide all edit controls.
- Account area: build a simple /account layout with navigation from the registry's accountNav, filtered by enabled modules. Keep the profile page from Phase 1 as the first item.
- Sections: every section type can declare requiresModule. Hide those types in the "Add section" dialog when the module is disabled, skip them on the public site, and show them with a "module turned off" notice in the editor. The Phase 4 module feed section uses the same mechanism.
- Links: module links in menus and buttons already hide when disabled; confirm they use the cached registry state.
- Staff permission matrix: show only each module's declared actions, with the module's enabled state and dependencies beside it.
- Caching: enabling or disabling a module revalidates the "modules" and "menus" tags and every published page, so the public site updates immediately.
- Integration health: getModuleHealth(key) combines the manifest's requiredIntegrations with the env integrations helper and the module's own getHealth. Show warnings on the modules screen and the module's admin pages.

## Step 6: Modules admin screen (super admin only)
Build /admin/modules:
- A card per module with icon, name, description, an on/off switch, status (on, off, or on with warnings), requirements (required modules and integrations, each marked met or not, with links to fix them such as the Integrations settings tab), soft relationships, and links to the module's admin page and settings.
- Enabling: if requirements are not met, the switch is disabled and the card explains why. Otherwise, a confirmation dialog summarizes what will appear (public pages, nav items, account pages, section types), then enables through a protectedAction calling set_module_enabled.
- Disabling: a confirmation dialog explains the disabled behavior in plain language, shows the data summary, lists anything that will be hidden (menu items and sections currently pointing to the module), and requires ticking "I understand this hides the module but keeps its data." Block with a clear message if another enabled module depends on it.
- Module settings: /admin/modules/[key]/settings renders the manifest's settingsSchema with the Phase 4 form generator, saved through update_module_settings. Modules without settings show a simple "No settings yet" message.
- The dashboard shows quick links to enabled modules the user can access.

## Step 7: Module scaffold script
Create pnpm module:new <key> that generates, for a key already present in the registry:
- src/modules/<key>/ with folders for components, actions, queries, sections, and admin, a README, and a stub for any missing parts of the manifest
- a new migration file from supabase/templates/module-table.sql with the key filled in and TODOs for columns
- a pgTAP test file stub using the Step 4 role checks
- a docs/phases stub for the module's phase

It must never overwrite existing files, and must support --dry-run to list what it would create. Document it in CLAUDE.md.

## Step 8: Tests
- Vitest: registry validation (including a deliberately broken fixture registry for each rule), the enable and disable decision logic in the app (requirements, dependents, integrations), module health, and reserved paths derived from the registry.
- pgTAP: set_module_enabled dependency rules and audit entries, update_module_settings permissions, the policy template tests from Step 4, and the module_dependencies sync.
- Playwright:
  - Enable blog: the Blog item appears in the admin nav, /blog shows the placeholder, and the header's Insights link appears.
  - Disable blog: /blog returns 404, the nav item and Insights link disappear, a staff member with blog permissions loses access, and the super admin sees the turned-off notice.
  - Email marketing cannot be enabled while CRM is off; CRM cannot be disabled while email marketing is on.
  - With Stripe keys missing, the shop switch is disabled with a link to Integrations.
  - Enabling shop (with test Stripe keys in the test env) shows "My orders" in the account area for a regular user; disabling it hides it.
  - A module section type appears in the "Add section" dialog only when its module is enabled.
- pnpm module:new blog --dry-run lists the expected files without writing anything.

## Step 9: Documentation
- Update CLAUDE.md with a "How to build a module" checklist that every module phase must follow: run the scaffold, complete the manifest, write migrations using the policy template, use requireModulePublic and requireAccess, use protectedAction and protectedRoute, register sections and feed providers through the manifest, record media_references, apply the webhook rule, add pgTAP tests for every role with the module on and off, add Playwright tests for enable and disable behavior, and update docs. Also document the disabled behavior rule and update "Current state."
- Write docs/phases/phase-5.md.

## Done when
- All nine modules appear on the modules screen with correct requirements, and toggling any of them updates the public site, admin, account area, menus, and sections immediately.
- Disabled modules are hidden and read-only everywhere while their data stays intact, enforced by both the app and RLS.
- The policy template is tested for every role in both module states.
- The scaffold script and the "How to build a module" checklist are ready for Phase 6.
- All tests pass locally and in CI, along with lint, typecheck, and build.

When finished, report: what was built, any deviations and why, and anything I should check by hand.