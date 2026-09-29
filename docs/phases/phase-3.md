# Phase 3: Branding, site settings, media library, and site chrome

## Context

Read CLAUDE.md and docs/phases/phase-0.md through phase-2.md first and follow every rule in CLAUDE.md, especially the "How to protect things" section. Phases 0 to 2 are complete: foundation, core tables and roles, auth, the access guard (requireAccess, protectedAction, protectedRoute), the admin shell, staff management, and the audit log.

This phase makes each deployment brandable from the admin: site settings, theme colors and fonts, a shared media library with a reusable media picker, the public site's top bar, header, and footer, default SEO, and an integrations status page. The visual target is docs/design/homepage-desktop.png and docs/design/homepage-mobile.png. If a reference/north-co-starter folder exists, take exact colors, fonts, and spacing from it instead of estimating from the images.

Work through the steps in order, commit after each step, and stop at the end to report back.

## Out of scope for this phase

No homepage sections or section editor, no custom pages, no navigation menu editor (all Phase 4). No module features. The header and footer links use a temporary default link list in code that Phase 4 will replace with editable menus. Allowed new dependencies: resend (for the test email) and isomorphic-dompurify (for SVG sanitizing). Ask before adding anything else.

## Step 1: Settings schema migration

Extend public.site_settings with these columns (keep the single-row design and existing RLS: anyone reads, only the super admin updates):

- General: tagline, description (used for the footer blurb and default meta description)
- Contact: contact_email, phone, location_label (for example "San Francisco Bay Area, CA"), address (full, optional), map_url
- Social: social_links jsonb (array of { platform, url })
- Brand assets: logo_media_id, logo_on_dark_media_id, favicon_media_id, og_image_media_id (all nullable, referencing media_assets, created in Step 3; add these foreign keys in the Step 3 migration if needed for ordering)
- Theme: theme jsonb (colors, heading font, body font, radius). Define and document its shape with a Zod schema in src/core/settings/theme.ts, including a version number for future changes
- Header and footer: show_top_bar boolean default true, header_cta_label, header_cta_href, footer_copyright, privacy_href, terms_href
- SEO: seo_title_template (for example "%s | North / Co"), allow_indexing boolean default false (new client sites stay out of search engines until launch)

Update the single existing row with the North / Co placeholder values from the design: site name "North / Co", the contact email, phone, and location shown in the images, the footer blurb, header CTA "Let's talk", and theme colors (navy, coral accent, light gray section background) and fonts matching the design.

Add every change to the audit log through a security definer function public.update_site_settings(changes jsonb) that only the super admin can call, which validates keys against an allow-list and writes one audit entry listing the changed fields. The admin UI uses this function instead of direct updates.

## Step 2: Settings loading and theming

- Create src/core/settings/get-settings.ts that loads site settings once per request and caches them across requests using the caching API of the installed Next.js version, tagged "site-settings". Every settings save revalidates that tag so changes appear on the live site immediately without a redeploy.
- In the root layout, render the theme as CSS variables (the token names from Phase 0) from the stored theme, so Tailwind and shadcn pick them up everywhere. Derive hover and active shades and a readable foreground color for the accent and navy automatically (use OKLCH math in a small pure function, no new dependency).
- Fonts: next/font needs fonts declared at build time, so declare a curated list of about six Google fonts (including the one matching the design) and let the theme choose heading and body fonts from that list by key. Document how to add a font to the list.
- Add a contrast check function that reports whether accent-on-white and white-on-accent text meet WCAG AA, used by the admin preview in Step 6.

## Step 3: Media library database and storage migration

- Create a public storage bucket named "media" for site assets. Storage policies: anyone can read; insert, update, and delete require public.can('media', 'create' / 'edit' / 'delete') respectively.
- Create public.media_folders: id, name, parent_id (self reference, nullable), created_at, created_by.
- Create public.media_assets: id, storage_path (unique), filename, mime_type, size_bytes, width, height, alt_text, caption, folder_id, uploaded_by, created_at, updated_at.
- Create public.media_references: media_id, entity_table, entity_id, field, primary key on all four. The app records a reference whenever a saved record points at a media asset, so the library can show where an asset is used and block deleting assets in use. Record references for the four site_settings brand asset fields in this phase.
- RLS: anon and authenticated can select media_assets (the public site needs URLs and alt text) but use column grants so uploaded_by is not readable by anon; insert, update, and delete follow can('media', action). media_folders follows the same rules. media_references is readable by staff with media 'view' and written only through security definer functions.
- Add the brand asset foreign keys from site_settings to media_assets with on delete set null.

## Step 4: Media library admin

Build /admin/media, protected with requireAccess({ scope: 'media', action: 'view' }):

- Grid and list views, folder navigation with breadcrumbs, search by filename or alt text, filter by type, and server-side pagination.
- Upload by drag and drop or file picker, multiple files at once, with per-file progress. Flow: a protectedAction checks permission and validates type and size and returns a signed upload URL; the browser uploads directly to storage; a second protectedAction confirms the upload, reads the image dimensions, and creates the media_assets row. Clean up the storage object if confirmation fails.
- Allowed types: JPEG, PNG, WebP, AVIF, GIF, and PDF, up to 10 MB. SVG is allowed only for the super admin and is sanitized server-side with isomorphic-dompurify before saving.
- Asset detail drawer: preview, filename, dimensions, size, copyable URL, editable alt text and caption, folder move, and a "Used in" list from media_references. Show a warning badge on images missing alt text.
- Delete: blocked with a clear message if the asset is referenced; otherwise confirm and remove both the storage object and the row.
- Create, rename, and delete folders (only empty folders can be deleted).
- Buttons for upload, edit, and delete are hidden with usePermissions() when the user lacks the action; the server and RLS enforce it regardless.

Configure next/image remote patterns for the Supabase storage domain and create a MediaImage component that takes a media asset and renders next/image with correct width, height, and alt text.

## Step 5: Reusable media picker

Create a MediaPicker component: a dialog that shows the library with search and folders, lets the user upload in place, filter to allowed types (for example images only), and returns the selected asset. It shows the current selection with a thumbnail, and offers change and remove. Every future phase that needs an image (sections, blog posts, products, galleries) must use this component. Document it in CLAUDE.md.

## Step 6: Settings admin

Build /admin/settings (super admin only) with tabs. Each tab saves through a protectedAction that calls update_site_settings, shows a success toast, and warns about unsaved changes when leaving.

- General: site name, tagline, description.
- Contact: email, phone, location label, address, map URL.
- Branding: logo, logo for dark backgrounds, and favicon via MediaPicker; accent, navy, background, muted, and border colors with color inputs and hex fields; heading and body font selects; corner radius. Include a live preview panel beside the form that renders a mini header, eyebrow label, heading, accent button, dark button, and card using the unsaved values, plus the contrast check results. A "Reset to defaults" button restores the seeded theme.
- Header and footer: top bar on or off, header CTA label and link, footer copyright, privacy and terms links.
- Social: add, remove, and reorder social links with a platform select (Facebook, Instagram, LinkedIn, X, YouTube, TikTok, email, phone).
- SEO: title template, default description, default share image via MediaPicker, and the "Allow search engines to index this site" toggle with a warning when turning it on or off.
- Integrations: see Step 8.

## Step 7: Public site chrome

Build these public components and use them in the public layout, matching docs/design/ at 390px and 1440px:

- TopBar: phone and email with icons on the left, location on the right, hidden when show_top_bar is off or when all three are empty. On mobile, show only phone and email in a compact row, as in the mobile reference.
- Header: logo (using logo_on_dark when the header background is navy), navigation links, and the CTA button with an arrow icon on desktop; on mobile, the logo and a hamburger that opens a full-height sheet with the links and CTA. Highlight the active link.
- Logo fallback: when no logo is uploaded, render the design's style of wordmark (accent square with the site name's first letter, followed by the site name).
- Footer: logo, description blurb, social icon buttons, two link columns ("Explore" and a second column), a "Get in touch" column with email, phone, and location with icons, and a bottom row with copyright and privacy and terms links. Stack columns on mobile as in the mobile reference.
- Shared primitives if not already present: Eyebrow (uppercase, wide tracking, accent color, short leading dash), and button variants for solid accent, solid dark, and text link, each with an optional arrow icon. Later phases reuse these.

Header and footer links come from a temporary default list in src/core/navigation/defaults.ts, with a TODO pointing to Phase 4.

## Step 8: Integrations status (super admin only)

In the Integrations tab of settings, show a card for Stripe, Resend, and Mux with:

- Configured or not configured, based on the env integrations helper from Phase 0, listing which env var names are missing (never the values).
- A "Test connection" button: Resend sends a test email to the super admin's address; Stripe and Mux call a lightweight read-only endpoint of their REST APIs with fetch. Show success or the provider's error message.
- The webhook URL each provider will need in later phases, with a copy button, built from NEXT_PUBLIC_SITE_URL.

## Step 9: Default SEO and metadata

- Root metadata from settings: title template, default description, share image, favicon, and theme color from the accent.
- Serve the favicon from the uploaded favicon asset through an icon route, falling back to a generated icon using the logo fallback style.
- robots.txt that disallows everything when allow_indexing is false and allows everything when true, and a robots noindex meta tag in the same case. The full sitemap comes in Phase 15.

## Step 10: Tests

- Vitest: theme Zod schema, OKLCH shade and foreground derivation, contrast check, the social links schema, and the upload validation (type and size rules, SVG only for super admin).
- pgTAP: update_site_settings rejects non-super-admins and unknown keys; media_assets and storage policies for each role (anon read only, staff with only media 'view' cannot upload, staff with 'create' can upload but not delete without 'delete'); uploaded_by is not readable by anon; media_references cannot be written directly.
- Playwright:
  - The super admin changes the accent color and site name, and the public header, buttons, and page title update without a redeploy.
  - The super admin uploads an image, adds alt text, sets it as the logo through the picker, and it appears in the header; deleting that image is then blocked with a "used in" message.
  - A staff member with only media 'view' sees the library but no upload or delete buttons, and a direct upload attempt fails.
  - A staff member without media access cannot open /admin/media.
  - The mobile header menu opens and closes at 390px, and the top bar and footer match the mobile layout.
  - robots.txt blocks indexing by default and allows it after the toggle is turned on.
- Add screenshot comparisons of the public header, top bar, and footer at 390px and 1440px as a visual reference for future phases (store baselines in the repo).

## Step 11: Documentation

- Update CLAUDE.md: the settings shape and how to read settings, the theme token names and the rule to never hard-code colors, the font list and how to extend it, MediaImage and MediaPicker as the only way to handle images, the media_references rule (record a reference whenever a record points at a media asset), the shared Eyebrow and button primitives, and "Current state."
- Write docs/phases/phase-3.md.
- In README.md, add the per-client branding checklist: upload logos and favicon, set colors and fonts, fill contact details, set the SEO defaults, test integrations, and turn on indexing only at launch.

## Done when

- A new deployment shows the North / Co look by default, and changing settings in the admin rebrands the whole public site and admin without a redeploy.
- The media library handles upload, organize, alt text, pick, and protected delete, and every permission rule holds in both the app and RLS.
- The top bar, header, and footer match the reference images at mobile and desktop widths.
- Integration status and tests work for whatever keys are configured.
- All tests pass locally and in CI, along with lint, typecheck, and build.

When finished, report: what was built, any deviations and why, any manual Supabase or Vercel steps (such as the storage domain for images), and anything I should check by hand.
