# Phase 4: Homepage section builder, pages, and navigation

## Context
Read CLAUDE.md and docs/phases/phase-0.md through phase-3.md first and follow every rule in CLAUDE.md, especially "How to protect things," the theme token rules, MediaPicker/MediaImage, media_references, and the shared Eyebrow and button primitives. Phases 0 to 3 are complete.

This phase builds the page system: pages made of editable sections, a section registry matching docs/design/, a visual page editor with live preview, draft and publish with revision history, a navigation menu editor, and a contact form. When this phase is done, a fresh deployment shows the complete North / Co homepage from docs/design/, and every part of it is editable in the admin.

All content editing uses the core scope 'content': 'view' to see the editor, 'create' to add pages, 'edit' to change drafts and menus, 'publish' to publish, and 'delete' to delete pages.

Work through the steps in order, commit after each step, and stop at the end to report back.

## Out of scope for this phase
No module features. The module feed section is built here, but no module provides items until Phase 6 (blog), so it renders nothing on the public site for now. Contact form submissions are stored and emailed but not managed as CRM contacts (Phase 9). Allowed new dependencies: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, and the Tiptap packages needed for a basic rich text editor (starter kit, link, and a server-side HTML renderer). Ask before adding anything else.

## Step 1: Database migration
Create:
- public.pages: id, title, slug (citext, unique), is_home boolean with a partial unique index so only one page is the homepage, status ('draft', 'published'), published_sections jsonb (the published snapshot the public site renders), published_at, seo_title, seo_description, og_image_media_id (references media_assets, on delete set null), created_by, updated_by, created_at, updated_at.
- public.page_sections (the draft working copy): id, page_id (on delete cascade), type text, sort_order int, props jsonb, background text, padding text, anchor_id text, is_hidden boolean default false, created_at, updated_at. Unique (page_id, sort_order) deferrable so reordering works in one transaction.
- public.page_revisions: id, page_id, sections jsonb, published_by, published_at. Keep the last 20 per page (delete older ones on publish).
- public.menus: id, key text unique ('header', 'footer_1', 'footer_2'), title (used as the footer column heading).
- public.menu_items: id, menu_id, parent_id (nullable, one level of nesting allowed for the header only), label, link jsonb (see Step 3), sort_order, open_in_new_tab boolean.
- public.contact_submissions: id, page_id, name, email, phone, company, message, source_url, status ('new', 'read', 'archived'), created_at. Phase 9 will move these into the CRM.

Security definer functions (search_path = '', audit entries for each):
- public.reorder_sections(page uuid, ordered_ids uuid[]): requires can('content', 'edit'); rewrites sort_order atomically.
- public.publish_page(page uuid): requires can('content', 'publish'); copies the non-hidden draft sections (type, props, background, padding, anchor_id, in order) into published_sections, sets status 'published' and published_at, and writes a page_revisions row.
- public.unpublish_page(page uuid): requires 'publish'; cannot unpublish the homepage.
- public.restore_revision(revision uuid): requires 'edit'; replaces the page's draft sections with the revision's sections (it does not publish).
- public.discard_draft(page uuid): requires 'edit'; replaces draft sections with the current published snapshot.
- public.set_home_page(page uuid): super admin only; the target must be published.
- public.submit_contact_form(...): callable by anon; inserts a submission only if the page is published and contains a contact form section. Validate lengths inside the function.

RLS:
- pages: anon and authenticated can select published pages; staff with can('content', 'view') can select all. Insert requires 'create', update requires 'edit' (publishing columns change only through the functions; enforce with column grants), delete requires 'delete' and never the homepage.
- page_sections and page_revisions: staff with 'view' can select; page_sections writes require 'edit'; anon can never read either (the public site reads only published_sections).
- menus and menu_items: anyone can select; writes require 'edit'.
- contact_submissions: no direct insert (only through the function); the super admin and staff with 'content' 'view' can select and update status.

Record media_references for every media field in page sections and for og_image_media_id, updating them whenever a section or page is saved. Deleting a section or page removes its references.

## Step 2: Section registry
Create src/core/sections/ with a registry where each section type defines:
- key, label, description, icon, and a small preview thumbnail for the "Add section" dialog
- a Zod props schema with sensible defaults, plus field metadata for the admin form (field type, label, help text, placeholder, min and max items for lists)
- default props using the North / Co content from docs/design/
- allowed backgrounds and the default background
- an optional requirement, such as "needs a module feed provider"
- a server component renderer

Field types the form generator must support: text, textarea, rich text (Tiptap, limited to paragraphs, bold, italic, links, and lists, stored as JSON and rendered to sanitized HTML on the server), media (MediaPicker), link (Step 3), icon (Step 4), select, toggle, number, and repeatable lists of any of these with add, remove, and drag reorder.

Common settings on every section: background (white, light, navy, accent), padding (normal, compact, none), anchor ID for in-page links, and hidden.

Heading rule: the first section on a page renders its main heading as h1, and all others use h2, so every page has exactly one h1.

Props are validated with Zod when saving and again when rendering. A section whose props fail validation on the public site is skipped and logged, never crashing the page; in the editor it shows an error state explaining what to fix.

## Step 3: Links
Create a Link value type and a LinkField input used everywhere a link is needed (buttons, cards, menus): { kind: 'page', pageId } | { kind: 'url', href } | { kind: 'anchor', anchorId, pageId? } | { kind: 'email', address } | { kind: 'phone', number } | { kind: 'module', moduleKey, path }. Page links store the page ID so renaming a slug never breaks them. Module links are hidden automatically wherever they appear (menus, buttons) when that module is disabled. External URLs open in a new tab with rel="noopener noreferrer". Write a resolveLink function and unit test it.

## Step 4: Icon picker
Create an IconField that lets editors pick from a curated list of about 60 lucide-react icons suited to business sites (the ones used in docs/design/ plus common ones for services, values, and contact), with search and a grid preview. Store the icon key, never a component or SVG.

## Step 5: Section types
Build these section types, each matching docs/design/ at 390px and 1440px when given the default props:

1. Hero: eyebrow, headline, accent line (rendered in the accent color on its own line), paragraph, primary button (link and label), secondary text link, background image with a soft white fade on the text side, optional vertical side text, and a "show scroll indicator" toggle.
2. Image with text: image with the offset outline frame (toggle), optional stat badge (value such as "25+" and a label), eyebrow, heading, rich text, 0 to 4 features (icon, title, text), a button, and image position left or right. On mobile the image comes first.
3. Value strip: 2 to 4 items (icon, title, short text), default background navy, dividers between items on desktop, stacked on mobile.
4. Card grid: centered eyebrow, heading, and intro, then cards (icon, title, text, link) with an optional auto number (01, 02, …) in the corner, 2, 3, or 4 columns on desktop and one column on mobile. The whole card is clickable when it has a link, with the arrow icon in the corner.
5. Stats: eyebrow, heading, paragraph, text link, and 2 to 4 stats (value, label) in a grid with dividers, default background navy. Values count up when scrolled into view, disabled for users who prefer reduced motion.
6. Testimonial: image, eyebrow, heading, quote with the accent quote mark, author name, and author title.
7. CTA banner: eyebrow, heading, and a button, default background accent, with the button styled for contrast on the accent background.
8. Intro with image: centered eyebrow, heading, paragraph, text link, and a wide image below.
9. Module feed: eyebrow, heading, "view all" link, source (a select filled from registered feed providers), and item count (3 or 6). Define a FeedProvider interface (module key, label, a server function returning cards with image, category, date, title, and link) and an empty provider registry that Phase 6 will add the blog to. The card design matches the "Ideas worth sharing" cards in docs/design/. On the public site the section renders nothing if the provider's module is disabled or has no items; in the editor it shows an explanatory placeholder instead.
10. Rich text: eyebrow, heading, and rich text body, with a narrow or wide content width option.
11. Contact form: eyebrow, heading, paragraph, toggles for the phone and company fields, a success message, and an optional side panel showing the contact details from site settings. Submissions go through a server action that validates with Zod, uses a hidden honeypot field and a simple per-IP rate limit, calls submit_contact_form, and emails the site's contact email through Resend when Resend is configured. The form works without JavaScript and shows inline errors and a success state.

Images in all sections use MediaImage with proper sizes attributes, and image fields that are empty render a neutral placeholder (a light gray block with an image icon) in both the editor and the public site so the layout never breaks.

## Step 6: Page editor
Build under /admin/content:
- Pages list: title, path, homepage badge, status, an "unpublished changes" badge when the draft differs from the published snapshot, last updated by and when. Actions: create (title with auto-generated slug, starting from a blank page or a copy of an existing page), duplicate, open, view live, delete (never the homepage), and set as homepage (super admin only).
- Page editor /admin/content/pages/[id], a three-panel layout on desktop:
  - Left: the section list with drag-and-drop reordering (keyboard accessible through dnd-kit's keyboard sensor), and per-section actions: move up or down, duplicate, hide or show, delete with confirmation. An "Add section" button opens a dialog with each section type's thumbnail and description, and inserts the new section with its default props below the selected section.
  - Center: a live preview iframe of /preview/[pageId] rendering the draft with the real public components, with a desktop/mobile (390px) width toggle. Clicking a section in the preview selects it in the editor (use postMessage), and the preview refreshes after each save.
  - Right: the generated form for the selected section, plus its common settings.
  - On tablet and mobile, collapse to tabs (Sections, Edit, Preview).
- Autosave the draft with a short debounce and show "Saving…", "Saved", or an error with a retry. Warn before leaving with unsaved changes.
- Top bar actions: Publish (only with 'publish'; confirmation dialog listing how many sections changed), Discard draft changes, Unpublish (not the homepage), and History (a drawer of revisions with who and when, preview any revision, and restore it to the draft).
- Page settings dialog: title, slug with live validation (lowercase letters, numbers, and hyphens; unique; not reserved), SEO title, SEO description, and share image.
- Staff with only 'view' can open the editor read-only; every edit control is hidden, and the server and RLS enforce it regardless.

Reserved slugs live in src/core/pages/reserved-slugs.ts: admin, api, auth, preview, sign-in, sign-up, account, forgot-password, reset-password, not-authorized, plus the future module paths blog, gallery, videos, shop, cart, checkout, orders, directory, booking, and bookings. Phase 5 will derive the module paths from the module registry.

## Step 7: Public rendering
- The homepage renders at / and other pages at /[slug] through an optional catch-all route in the public group. Explicit module routes added in later phases take precedence automatically.
- Read only published_sections, cached with a tag per page and revalidated on publish, unpublish, and restore-then-publish.
- generateMetadata uses the page's SEO fields, falling back to site settings and the title template.
- Draft, unpublished, and missing pages return the site's 404 page, styled to match the site.
- /preview/[pageId] requires content 'view', renders the draft with the public layout, adds a noindex tag, and shows a small "Preview" bar with a link back to the editor.
- Keep sections as server components; only the mobile menu, stats count-up, and contact form are client components.

## Step 8: Navigation menus
Build /admin/content/navigation with editors for the header menu and the two footer columns (including each column's heading):
- Add, edit, remove, and drag-reorder items, each with a label and a LinkField, and an "open in new tab" option. The header allows one level of dropdown children; footer columns are flat.
- Replace src/core/navigation/defaults.ts from Phase 3: the header and footer now read the menus from the database, cached with a "menus" tag revalidated on save. Delete the defaults file.
- Menu items that point to an unpublished page or a disabled module are hidden on the public site and marked with a warning in the editor.

## Step 9: Seed content
- In a migration, seed the homepage with all the sections from docs/design/ in order (hero, image with text, value strip, card grid of the six services, stats, testimonial, CTA banner, intro with image, module feed for insights), using the North / Co default text and empty image fields. Also seed published pages for About, Services, Our Impact, and Contact, each with a hero and a rich text section, plus a contact form section on Contact.
- Seed the menus from docs/design/: header (Home, About, Services, Our Impact, Insights as a module link to the blog), footer column "Explore" (the same links), and footer column "What we do" (the four service names linking to anchors on the Services page).
- Create a script pnpm seed:media that uploads every image in seed/media/ to the client's media bucket, creates media_assets rows with alt text from a seed/media/manifest.json (filename, alt text, and which section and field it belongs to), fills those image fields in the homepage draft, and publishes the homepage. It must be safe to run twice (skip images that already exist). Document it in the README as part of new client setup.

## Step 10: Tests
- Vitest: every section's schema accepts its defaults and rejects bad input; resolveLink for every link kind, including disabled modules; slug validation and reserved slugs; the heading-level rule; the rich text renderer strips disallowed HTML.
- pgTAP: anon can read published pages but never drafts, page_sections, or revisions; staff with 'edit' but not 'publish' cannot call publish_page; only 'delete' can delete pages and never the homepage; reorder_sections is atomic; submit_contact_form rejects unpublished pages and pages without a contact form; restore_revision and discard_draft follow their permissions; every function writes an audit entry.
- Playwright:
  - Edit the hero headline; the live site does not change until Publish, and then it does.
  - A staff member with 'edit' but not 'publish' can edit the draft but sees no Publish button, and a direct publish call is rejected.
  - Add a card to the card grid, reorder sections with the keyboard, hide a section, and confirm the published page matches.
  - Restore an older revision and publish it.
  - Create a page, add it to the header menu, publish, and see it in the header on desktop and in the mobile menu at 390px.
  - A reserved slug is rejected.
  - Submit the contact form (success, validation errors, and the honeypot blocking a bot submission).
  - Screenshot the seeded homepage at 390px and 1440px as visual baselines. Compare them against docs/design/ and list any visible differences in your final report.

## Step 11: Documentation
- Update CLAUDE.md: the page and section model, the draft/publish/revision flow, how to add a new section type (step-by-step checklist), the FeedProvider interface for modules, the Link type and LinkField, IconField, reserved slugs, the heading rule, and "Current state."
- Write docs/phases/phase-4.md.
- In README.md, add seed:media to the new client setup steps and describe the manifest format.

## Done when
- A fresh deployment, after migrations and seed:media, shows the full North / Co homepage matching docs/design/ at mobile and desktop widths.
- Every text, image, link, icon, and list item on the homepage and seeded pages is editable in the admin, with live preview, autosave, publish, and revision restore.
- Header and footer navigation are fully editable.
- Permissions for view, create, edit, publish, and delete hold in both the app and RLS.
- All tests pass locally and in CI, along with lint, typecheck, and build.

When finished, report: what was built, any deviations and why, the visible differences between the seeded homepage and the reference images, and anything I should check by hand.