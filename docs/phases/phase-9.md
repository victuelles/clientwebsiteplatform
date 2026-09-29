# Phase 9: CRM module

## Context
Read CLAUDE.md and docs/phases/phase-0.md through phase-8.md first and follow every rule in CLAUDE.md. Follow the "How to build a module" checklist step by step, and fix the checklist if anything in it proves unclear or wrong.

The module's key is 'crm'. It has no public routes. It uses the actions view, create, edit, and delete, plus a new 'export' action added in Step 2. Its manifest and placeholder admin page already exist from Phase 5. Email marketing (Phase 10) requires this module, and the shop, booking, and directory modules will send contacts and activity into it, so this phase also creates the shared way modules talk to each other.

The CRM holds personal information. Nothing in it is ever readable by anon or regular users, every export and deletion is audited, and it must support honoring a person's request to see or delete their data.

Work through the steps in order, commit after each step, and stop at the end to report back.

## Out of scope for this phase
No sending emails from the CRM (Phase 10), no restricting staff to only their assigned contacts, no multiple deal pipelines, no calendar sync, no email inbox sync. Allowed new dependency: papaparse (CSV import and export). Ask before adding anything else.

## Step 1: Scaffold
Run pnpm module:new crm and build on the generated files. Complete the manifest: admin nav (Dashboard, Contacts, Companies, Deals, Tasks, Inbox, Import), settingsSchema (Step 11), getDataSummary (contacts, companies, open deals, open tasks), actions including 'export', and the service from Step 3.

## Step 2: 'export' permission action (platform change)
Add 'export' to the permission_action enum in a migration, add it to the scope registry and the Phase 2 drift test, and make the staff permission matrix show it only for modules that declare it in their manifest. Only CRM declares it for now. Update CLAUDE.md so future modules that let staff download personal data use 'export'.

## Step 3: Module services (platform pattern)
Add an optional services field to ModuleManifest and a core helper getModuleService(key) that returns the module's service only when the module is enabled, and null otherwise. Other modules call it like this: if the CRM service exists, record the contact and activity; if not, do nothing and carry on. Modules never import each other's folders directly. Document this in CLAUDE.md as the only way modules interact.

The CRM service exposes:
- upsertContact({ email, firstName, lastName, phone, companyName, source, ownerId?, tags?, consent? }): finds a contact by email (case-insensitive), fills only empty fields on an existing contact (never overwrites values staff have entered), creates one if none exists, links profile_id if a registered user has that email, and returns the contact ID.
- recordActivity({ contactEmail or contactId, type, subject, body, occurredAt, related: { table, id }, metadata }).
- linkProfile(profileId, email): links a newly registered user to an existing contact.
These run on the server through security definer SQL functions (Step 4) so the calling module does not need CRM permissions.

## Step 4: Database migration
Using the module table template (staff and super admin access only; no public or owner policies), create:
- public.crm_contacts: id, first_name, last_name, email (citext, unique when not null), phone, job_title, company_id, lifecycle_stage (a key from settings, default 'lead'), status ('active', 'archived'), source ('manual', 'contact_form', 'import', 'shop', 'booking', 'directory', 'newsletter', 'other'), owner_id (staff profile), profile_id (linked registered user, unique when not null), address fields (line 1, line 2, city, region, postal code, country), custom jsonb, email_consent ('unknown', 'subscribed', 'unsubscribed'), consent_updated_at, consent_source, last_activity_at, created_by, timestamps. A generated tsvector on names, email, phone, and job title with a GIN index.
- public.crm_companies: id, name, website, phone, industry, address fields, custom jsonb, owner_id, timestamps, with a name search index.
- public.crm_tags (id, name unique, color) and join tables crm_contact_tags and crm_company_tags.
- public.crm_custom_fields: id, entity ('contact' or 'company'), key (unique per entity), label, type ('text', 'long_text', 'number', 'date', 'select', 'multi_select', 'boolean', 'url'), options jsonb, is_required, sort_order.
- public.crm_activities: id, contact_id, company_id, deal_id, type ('note', 'call', 'email', 'meeting', 'form_submission', 'order', 'booking', 'listing', 'subscription', 'system'), subject, body, occurred_at, related_table, related_id, metadata jsonb, created_by, created_at. Index (contact_id, occurred_at desc). A trigger keeps crm_contacts.last_activity_at current.
- public.crm_tasks: id, title, notes, due_at, priority ('low', 'normal', 'high'), status ('open', 'done'), assigned_to, contact_id, company_id, deal_id, completed_at, created_by, timestamps.
- public.crm_deals: id, title, contact_id, company_id, value_cents, currency, stage (a key from settings), status ('open', 'won', 'lost'), expected_close_date, closed_at, lost_reason, owner_id, sort_order within stage, timestamps.
- public.crm_saved_views: id, name, entity ('contact', 'company', 'deal'), filters jsonb (Step 6 format), columns jsonb, sort jsonb, is_shared boolean, created_by, timestamps. Staff see their own views and shared views.

Security definer functions (search_path = '', audit entries where noted):
- crm_upsert_contact, crm_record_activity, and crm_link_profile, backing the service in Step 3. Each checks module_enabled('crm') and does nothing when disabled. Revoke execute from anon and authenticated; call them only from the server with the admin client.
- crm_merge_contacts(primary uuid, duplicate uuid, field_choices jsonb): requires 'edit'; moves activities, tasks, deals, tags, and the linked profile to the primary, applies the chosen field values, deletes the duplicate, and writes an audit entry.
- crm_delete_contact(contact uuid): requires 'delete'; permanently deletes the contact and its activities, tasks, and tag links, removes their contact form submissions or blanks their personal fields (choose one approach and document it), and writes an audit entry with no personal data in it.
- crm_move_deal(deal uuid, stage text, ordered_ids uuid[]): requires 'edit', atomic.

Also add a trigger on profiles insert (in core, calling the CRM function only when the module is enabled) so users who register later are linked to their existing contact.

## Step 5: Contact form integration
- When the CRM is enabled, every new contact form submission (Phase 4) calls the CRM service: upsert the contact with source 'contact_form', record a form_submission activity with the message, assign the default owner from settings, and optionally email a notification to the owner or site contact email (setting).
- When the CRM is disabled, submissions are still stored and emailed as in Phase 4.
- On the CRM dashboard, if there are submissions that were never synced (for example ones received while the module was off, or before it was first enabled), show "X form submissions are not in the CRM yet" with an Import button that syncs them. Track synced submissions with a crm_synced_at column on contact_submissions.

## Step 6: Filters and saved views
Define a JSON filter format in src/modules/crm/lib/filters.ts: a list of conditions joined by AND or OR, each with a field, an operator, and a value. Fields cover standard columns, tags (has any, has all, has none), custom fields, email consent, lifecycle stage, source, owner, company, created date, and last activity date. Operators depend on the field type (is, is not, contains, starts with, is empty, before, after, within the last N days, and so on).
- Validate filters with Zod and translate them into parameterized Supabase queries on the server, never string-built SQL.
- Build a filter builder UI used on the contacts, companies, and deals lists, with save as a view (private or shared), rename, and delete.
- Export the filter format and query builder through the CRM service, because Phase 10 will use saved views as email audiences.

## Step 7: Admin screens
Protect everything with requireAccess and protectedAction for scope 'crm', and hide controls the user cannot use.
- CRM dashboard: new contacts this week and month, open deals value by stage, my open tasks (overdue first), recent activity, recent form submissions, and the unsynced submissions notice from Step 5.
- Contacts list: a table with configurable columns (including custom fields), the filter builder and saved views as tabs, search, sort, server-side pagination, and bulk actions (add or remove tags, change owner, change lifecycle stage, archive, delete, export), each limited to allowed actions.
- Contact detail page: a header with name, company, lifecycle stage, owner, tags, and quick actions (email link, phone link, log activity, add task, add deal); an editable details panel with standard and custom fields, address, consent status (shown read-only with its source and date; Phase 10 manages subscriptions); an activity timeline with type filters, where notes, calls, and meetings can be added and edited and linked records (form submissions, and later orders and bookings) show a summary; plus tasks, deals, and a "Linked account" indicator when the contact is a registered user.
- Companies list and detail page: the same patterns, with the company's contacts, deals, and a combined activity timeline.
- Deals: a kanban board by stage with drag and drop (keyboard accessible, using crm_move_deal), stage totals, a list view with filters, and a deal detail drawer with won or lost actions (lost asks for a reason).
- Tasks: "My tasks" and "All tasks" views, grouped by overdue, today, upcoming, and no date, with quick complete, and task creation from anywhere in the CRM.
- Inbox: contact form submissions (new, read, archived) with the linked contact, mark as read, archive, and open contact.
- Duplicates: a page that finds likely duplicates (same email, same phone, or very similar names within the same company) and opens a side-by-side merge screen where staff pick which value to keep for each field.
- Settings for custom fields: create, edit, reorder, and delete custom field definitions for contacts and companies (deleting warns how many records have a value).

## Step 8: Import and export
- Import (requires 'create'): upload a CSV, auto-map columns to fields (including custom fields) with manual override, choose what to do with existing emails (skip, fill empty fields only, or overwrite), optionally add a tag to everyone imported, preview the first rows and every validation error, then import in batches with progress and a downloadable error report. Consent is never set to 'subscribed' by an import unless staff tick a box confirming these people agreed to receive email, and the consent source is recorded as the import file name and date.
- Export (requires 'export'): export the current filtered list of contacts, companies, or deals to CSV with the visible columns. Every export writes an audit entry with the filter, row count, and who exported it.
- Personal data request tools on the contact detail page: "Download this person's data" (a JSON file of the contact, company, activities, tasks, deals, and submissions; requires 'export', audited) and "Permanently delete" (crm_delete_contact; requires 'delete'; the confirmation explains it cannot be undone).

## Step 9: Registered user linking
When a user signs up, call the CRM service's linkProfile so their existing contact (from a form, import, or later an order) is connected to their account, and record a system activity. Show the linked account on the contact page. Regular users still cannot see any CRM data.

## Step 10: Disabled behavior
Follow the module rule: when disabled, the CRM admin is hidden (super admin read-only), all writes are blocked, and the service returns null, so other modules and the contact form keep working without it. Nothing is synced while disabled, and the unsynced import from Step 5 catches up form submissions when it is re-enabled. Email marketing cannot be enabled without the CRM (already enforced in Phase 5).

## Step 11: Module settings
Lifecycle stages (editable list with keys, labels, and colors; default: Lead, Prospect, Customer, Partner, Other), deal stages (default: New, Qualified, Proposal, Negotiation) and currency, default owner for new contacts from forms, email notifications for new form submissions (off, site contact email, or the default owner), and whether contact form submissions create contacts automatically.

Changing or removing a stage that is in use asks which stage to move those records to.

## Step 12: Seed content
Seed only the default lifecycle and deal stages in settings. Do not seed contacts or other personal data.

## Step 13: Tests
Follow the checklist, including:
- Vitest: filter validation and query translation for every field type and operator (including attempts to inject SQL through values), CSV column auto-mapping, import row validation, the upsert rule (fills empty fields only), custom field validation, and duplicate detection.
- pgTAP: anon and regular users cannot read or write any CRM table in any module state; staff access follows each action including 'export' only through the app; the service functions cannot be called by anon or authenticated and do nothing when the module is disabled; crm_merge_contacts moves everything and removes the duplicate; crm_delete_contact removes all personal data and its audit entry contains none; saved views are visible only to their owner unless shared; the profile trigger links matching contacts only when the module is enabled.
- Playwright:
  - Submit the public contact form; the contact, form_submission activity, owner assignment, and notification appear.
  - Create a contact with custom fields, add a note, a task, and a deal; move the deal across the kanban with the keyboard; mark it won.
  - Build a filter, save it as a shared view, and open it as another staff member.
  - Import a CSV with a duplicate email and an invalid row; check the preview, errors, skip behavior, and tag.
  - A staff member without 'export' sees no export buttons, and a direct export call is rejected; an export by an allowed user appears in the audit log.
  - Merge two duplicate contacts; download a contact's data; permanently delete a contact.
  - A new user registers with an email that matches a contact, and the contact shows the linked account.
  - Disable the CRM: the admin disappears for staff, contact form submissions still work and are stored, and after re-enabling, the unsynced import brings them in.
  - Contacts list, contact page, and deals board at 390px and 1440px, with screenshot baselines.

## Step 14: Documentation
- Update CLAUDE.md: the 'export' action, module services and getModuleService as the only way modules interact, the CRM service API that shop, booking, directory, and email marketing must use, the filter format, the personal data rules (no anon or user access, audited exports and deletions, data request tools, consent only with confirmation), and "Current state." Apply any checklist fixes.
- Write docs/phases/phase-9.md.
- In README.md, add a short privacy note for client setups: the CRM stores personal data, who should get 'export' and 'delete', and how to handle a person's request to see or delete their data.

## Done when
- Staff can manage contacts, companies, deals, tasks, and form submissions, with filters, saved views, import, export, merge, and data request tools.
- Contact form submissions flow into the CRM automatically, and registered users are linked to their contacts.
- Other modules have a tested service to send contacts and activity into the CRM that safely does nothing when it is off.
- Personal data is never exposed to anon or regular users, and every export and deletion is audited.
- All tests pass locally and in CI, along with lint, typecheck, and build.

When finished, report: what was built, any deviations and why, which approach you chose for contact form submissions on permanent deletion, any changes to the module checklist, and anything I should check by hand.