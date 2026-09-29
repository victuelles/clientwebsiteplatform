# Phase 4 notes: Homepage section builder, pages, and navigation

**Status:** complete (2026-09-29). Brief: [phase-4.md](phase-4.md).

## What was built

| Step | Result                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `20260929150000_pages_sections_menus.sql`: `pages`, `page_sections`, `page_revisions`, `menus`, `menu_items`, `contact_submissions`; media references kept by triggers (`media_ids_in`); `reorder_sections`, `publish_page`, `system_publish_page`, `unpublish_page`, `restore_revision`, `discard_draft`, `set_home_page`, `submit_contact_form`; RLS by `can('content', …)` plus column grants that keep publishing columns function-only. |
| 2    | Section registry (`src/core/sections`), field metadata, generated forms (`src/components/section-editor`), renderer pipeline that skips invalid props publicly.                                                                                                                                                                                                                                                                              |
| 3    | `Link` union, `resolveLink`, `LinkField`.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 4    | Curated icon registry (79 keys), `SiteIcon`, `IconField`.                                                                                                                                                                                                                                                                                                                                                                                    |
| 5    | The eleven section types with North / Co defaults; `FeedProvider` registry (empty); contact form action (honeypot, rate limit, RPC, Resend).                                                                                                                                                                                                                                                                                                 |
| 6    | `/admin/content` pages list and the editor: section list (drag, keyboard, menu actions), generated form panel, autosave, preview iframe with click-to-select, page settings, publish/unpublish/discard, history with restore. `profile_names()` for "last edited by".                                                                                                                                                                        |
| 7    | Public `/[[...slug]]` (homepage at `/`, `/home` → 308), metadata, preview route, cache tags.                                                                                                                                                                                                                                                                                                                                                 |
| 8    | `20260929150200_menus_save.sql` (`save_menu`, the three menus); `getMenus()`; header dropdowns and footer columns from the database; `/admin/content/navigation`; `defaults.ts` removed.                                                                                                                                                                                                                                                     |
| 9    | `20260929150300_seed_content.sql` (homepage, About, Services, Our Impact, Contact, menus); `pnpm seed:media` with `seed/media/manifest.json`; README setup.                                                                                                                                                                                                                                                                                  |
| 10   | Section schema and heading-rule unit tests, 43 pgTAP assertions for pages/menus/contact, Playwright specs for the editor, permissions, revisions, reserved slugs, contact form, menus, and homepage baselines.                                                                                                                                                                                                                               |
| 11   | CLAUDE.md "Pages, sections, and navigation", these notes.                                                                                                                                                                                                                                                                                                                                                                                    |

## Decisions and deviations

- **Media references are kept by triggers, not by the saving function.** Section props are free-form JSON, so `page_sections` and `pages` triggers collect every `mediaId` in the JSON (`media_ids_in`) and sync `media_references`. Section code never has to remember to record references. Usage labels for pages were added to `src/core/media/usage.ts`.
- **Heading rule counts visible sections.** The first section that is shown gets the h1, so hiding the hero promotes the next section's heading (tested).
- **Services page has one rich text section per service**, each with an anchor id (`growth-strategy`, …), plus a hero and an intro. The brief asked for "a hero and a rich text section"; the extra sections give the footer's "What we do" anchor links real targets.
- **Header menu follows the brief's five items** (Home, About, Services, Our Impact, Insights). Insights is a module link to `/blog`, so it stays hidden until the blog module is on (Phase 6). The Services design image also shows "Contact" in the header; add it in the menu editor if wanted.
- **Tiptap packages:** `@tiptap/starter-kit` (includes the link extension in v3), `@tiptap/html` (server renderer), plus `@tiptap/react` and `@tiptap/pm`, which the editor itself requires. Sanitizing reuses DOMPurify from Phase 3. No other dependencies were added.
- **`pnpm seed:media` is a plain `.mjs` script** that imports the upload rules and dimension reader straight from `src/core/media/*.ts` (Node 24 strips types), so it enforces the same rules as the app without a build step or a new dependency. Idempotency comes from a storage path derived from each file name.
- **Starter photos are cropped from the design PNGs.** They are low resolution; the hero photo in particular is upscaled and looks soft at 1440px. Replace them with the client's photos (drop files in `seed/media/`, update the manifest).
- **Contact rate limit is in memory** (5 per 10 minutes per IP, per server instance). On Vercel each instance keeps its own counter, so it slows bots rather than guaranteeing a limit; the honeypot and RPC validation still apply. A shared store can replace it in Phase 15 (hardening).
- **Public 404s inside the site layout** now use `(public)/not-found.tsx`; before, the catch-all route rendered the root 404 (which adds its own chrome) inside the public layout, doubling the header and footer.
- **Newly added list items open expanded** in the section form (found while writing the card test).
- **Menu editor e2e runs in the last Playwright project** (with branding), because it changes the site-wide header that the visual baselines capture. It removes its item at the end.

## Seeded homepage vs docs/design

Compared at 1440px and 390px (`tests/e2e/site.spec.ts-snapshots/homepage-*.png`):

- **Font:** the design renders in a DejaVu-like sans; the site uses Inter (the theme default). Headings look lighter and slightly narrower, and some lines wrap differently (for example "great execution." fits on one line on mobile).
- **Hero headline** is a little smaller than in the design at both widths.
- **Insights section ("Ideas worth sharing") is missing**, and so is "Insights" in the header and footer: they appear once the blog module provides items (Phase 6).
- **Photos** are crops of the design images, so they are softer, and the hero crop differs slightly.
- **Top bar** shows "Sign in" (or "Admin"/"Account" when signed in) on the right, which the design doesn't have. On mobile the top bar also shows the email.
- **Active nav item** is highlighted in the accent color with an underline; the design shows all items white.
- Otherwise section order, backgrounds, spacing, cards, stats, testimonial, CTA banner, and footer match.

## Check by hand

- Run `pnpm seed:media` against a real client project and confirm the images show and the media library entries have alt text.
- On a running deployment, direct database edits (seed:media, SQL) don't show until the page is published from the admin or the app is redeployed (cache tags).
- Send a contact form with Resend configured and check the notification email.
- Try the editor on a tablet width (tabs for Sections / Edit / Preview).
- Drag reorder with a mouse (the tests cover the keyboard).
