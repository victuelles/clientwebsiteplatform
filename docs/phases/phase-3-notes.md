# Phase 3 notes: Branding, site settings, media library, and site chrome

**Status:** complete (2026-09-29). Brief: [phase-3.md](phase-3.md).

## What was built

| Step | Result                                                                                                                                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `20260929140000_site_settings_branding.sql`: branding, contact, social, theme, header/footer, SEO columns; North / Co values; `update_site_settings(changes)` (super admin, allow-list, one audit entry with the changed fields). |
| 2    | `getSiteSettings()` cached under the `site-settings` tag; theme → CSS variables on `<html>`; OKLCH shades and readable foregrounds; curated font list; WCAG contrast check.                                                       |
| 3    | `20260929140100_media_library.sql`: public `media` bucket and storage policies, `media_folders`, `media_assets`, `media_references`, brand asset FKs; `update_site_settings` records references.                                  |
| 4    | `/admin/media`: grid/list, folders, search, type filter, pagination, multi-file upload with progress, asset drawer, folder management; `MediaImage`; `next/image` remote pattern.                                                 |
| 5    | `MediaPicker` (search, folders, upload in place, type filter, change/remove).                                                                                                                                                     |
| 6    | `/admin/settings` tabs with live branding preview, contrast results, reset, social editor, indexing confirmation, unsaved-changes warnings.                                                                                       |
| 7    | `TopBar`, `SiteHeader` (mobile sheet), `SiteFooter`, `Logo` fallback wordmark, `ActionLink`, `SiteContainer`, default links in `src/core/navigation/defaults.ts`.                                                                 |
| 8    | Integrations tab: status by env var name, webhook URLs, connection tests (Resend email, Stripe and Mux read-only fetches).                                                                                                        |
| 9    | Metadata from settings, `/brand-icon` favicon route, `robots.txt`, noindex until launch, admin always noindex.                                                                                                                    |
| 10   | 40 new pgTAP assertions, upload/dimension/theme/color/social unit tests, 5 new e2e specs, visual baselines.                                                                                                                       |
| 11   | CLAUDE.md, README branding checklist, these notes.                                                                                                                                                                                |

## Decisions and deviations

- **Caching uses the Data Cache through tagged `fetch`, not `"use cache"`.** Next 16 recommends
  `"use cache"`, but it requires enabling Cache Components, which changes how every page may read
  cookies and would push the auth guards under Suspense boundaries (turning their redirects
  into streamed 200s again). Settings are public, so a cookie-less Supabase client whose fetch
  is tagged `site-settings` (`createCachedPublicClient`) gives the same result: cached across
  requests, and `updateTag("site-settings")` on save makes changes live on the next request.
  Revisit if the project adopts Cache Components later.
- **`seo_description` column added** (not in the brief's list): the SEO tab's "default
  description" needed its own field. It falls back to `description` (the footer blurb) when empty.
- **The theme stores seven colors** (accent, navy, background, text, light section, secondary
  text, border). The brief listed five; text and secondary text are needed for readable custom
  palettes. Shades and foregrounds are derived, not stored.
- **Readable foreground rule**: white when it reaches 3:1 against the fill, otherwise dark text.
  A strict 4.5:1 rule would turn the design's coral buttons (white 3.48:1) to dark text. The
  Branding tab shows the exact ratio and labels it "AA large text only".
- **Fonts**: Inter (the Phase 0 match for the design), DM Sans, Manrope, Plus Jakarta Sans, Lora,
  Playfair Display. Only Inter is preloaded.
- **Uploads are verified on the server after the direct upload**: `confirmUpload` downloads the
  object, sniffs the real type from its bytes (a renamed HTML file is rejected), enforces size,
  reads dimensions from the file headers (small parser, no image library), sanitizes SVG with
  DOMPurify (script, `foreignObject`, `use`, and `href` removed), and deletes the object on any
  failure. Unconfirmed uploads (a browser that never calls confirm) can leave orphaned objects;
  a cleanup job belongs in Phase 15.
- **Database-level protections**: a referenced asset cannot be deleted (FK restrict from
  `media_references`), non-empty folders cannot be deleted, `storage_path` and `uploaded_by`
  cannot be changed (column grants), and anon cannot read `uploaded_by`.
- **`set_media_reference` is internal**: no API role can execute it; only security definer
  functions that save records call it.
- **Brand icons**: lucide-react 1.x no longer ships brand logos, so the footer uses small inline
  stroke glyphs for Facebook, Instagram, LinkedIn, X, YouTube, and TikTok (Mail/Phone from lucide).
- **Account links moved**: Sign in / Account / Admin sit in the top bar (desktop), the mobile menu,
  and the footer's legal row; Sign out is on `/account`.
- **The 404 page renders the site chrome** because it sits outside the `(public)` layout; until
  Phase 4 adds pages, the default nav links (About, Services, ...) land there.
- **Admin also rebrands**: the sidebar uses the same tokens, so accent and site name changes show
  in the admin immediately.
- **The favicon's letter is not italic** in the generated icon (the image renderer's built-in font
  has no italic); uploading a favicon replaces it.
- **Visual baselines are macOS renders** and are skipped in CI (Linux renders fonts differently).
  Refresh them with `pnpm exec playwright test --update-snapshots` after intended UI changes.
- **Settings-mutating e2e tests run in a separate `branding` project** that depends on the others,
  and they restore every setting through the UI.
- **Step 8 landed in the owner's "homepage ui created" commit** (it was uncommitted when that
  commit was made); the code is as described here.

## Manual steps

- **Supabase**: none new. The `media` bucket and its policies come from the migration. Run
  `pnpm db:push` against each client project as usual.
- **Vercel**: none new. Image optimization for the client's Supabase Storage domain is configured
  automatically from `NEXT_PUBLIC_SUPABASE_URL`.
- Per client, work through the README's "Branding checklist per client".

## Verified locally

- pgTAP 188/188, unit 145/145, integration 2/2, e2e 42/42 (plus 6 visual comparisons); lint,
  typecheck, format:check, and build pass.
- Changing the accent and site name updated the public header, buttons, title, and the admin
  without a redeploy; uploading, alt text, picking as the logo, and the blocked delete work;
  view-only staff cannot upload through the UI or directly against Storage.
