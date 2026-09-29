# Phase 6: Blog module

## Context
Read CLAUDE.md and docs/phases/phase-0.md through phase-5.md first and follow every rule in CLAUDE.md. Follow the "How to build a module" checklist step by step; if any part of the checklist turns out to be unclear or wrong while building this module, fix the checklist in CLAUDE.md and note the change in your report, because every later module will follow it.

The blog module's key is 'blog', its public base path is /blog, and it uses the actions view, create, edit, delete, and publish. Its manifest and placeholder pages already exist from Phase 5. The visual target for post cards is the "Ideas worth sharing" section in docs/design/: image, category in the accent color, date, title, and a "Read article" link.

Work through the steps in order, commit after each step, and stop at the end to report back.

## Out of scope for this phase
No comments, no per-author editing restrictions (any staff member with blog 'edit' can edit any post), no newsletter sending (Phase 10), no multilingual content. Allowed new dependencies: @tailwindcss/typography and additional official Tiptap extensions (heading, image, youtube, placeholder, character-count, underline, table of contents helpers if needed). Ask before adding anything else.

## Step 1: Scaffold
Run pnpm module:new blog and build on the generated files. Complete the blog manifest: admin nav (Posts, Categories, Tags, Authors), a settingsSchema (Step 9), a getDataSummary returning counts by status, and a sitemapEntries function (a new optional manifest field; add it to the ModuleManifest type) returning published post, category, tag, and author URLs for Phase 15.

## Step 2: Database migration
Using the module table template, create:
- public.blog_categories: id, name, slug (citext unique), description, sort_order, timestamps.
- public.blog_tags: id, name, slug (citext unique), timestamps.
- public.blog_authors: id, profile_id (nullable, unique, references profiles, so a staff member can be linked to an author but guest authors are also possible), display_name, slug (citext unique), role_title, bio, avatar_media_id, timestamps.
- public.blog_posts: id, title, slug (citext unique), excerpt, body jsonb (Tiptap JSON), body_html (sanitized HTML rendered on the server at save time), body_text (plain text for search and reading time), featured_media_id, category_id, author_id, status ('draft', 'scheduled', 'published', 'archived'), publish_at (for scheduling), published_at, is_featured boolean, reading_minutes int, seo_title, seo_description, og_media_id, draft_changes jsonb (pending edits to an already published post, see Step 3), created_by, updated_by, timestamps.
- public.blog_post_tags: post_id, tag_id, primary key on both.
- public.blog_post_revisions: id, post_id, snapshot jsonb, published_by, published_at. Keep the last 20 per post.
- public.blog_slug_redirects: old_slug (citext primary key), post_id. When a published post's slug changes, keep the old slug here so old links redirect.
- A generated tsvector column on blog_posts from title (weight A), excerpt (weight B), and body_text (weight C), with a GIN index. Use the 'english' configuration and note in CLAUDE.md where to change it for other languages.
- Indexes on status, publish_at, published_at, category_id, author_id, and is_featured.

Visibility rule: a post is publicly visible when the module is enabled and either status = 'published', or status = 'scheduled' and publish_at <= now(). Put this in a stable SQL function public.blog_post_is_public(status, publish_at) and use it in the policies, so scheduled posts appear on time even before the cron job runs.

RLS (from the template): public read of visible posts, and of categories, tags, authors, post tags for visible posts, and slug redirects, all only while the module is enabled. Staff read with can('blog', 'view'). Super admin read-only while disabled. Writes: create, edit, and delete need the matching blog action; status changes to published or scheduled, and applying draft_changes, happen only through the functions in Step 3 (enforce with column grants). Revisions are staff-read only.

Record media_references for featured images, share images, author avatars, and every image inside post bodies, updated on each save.

## Step 3: Publishing functions
Security definer functions with audit entries:
- public.publish_post(post uuid): requires can('blog', 'publish'). If draft_changes is present, applies them to the columns and clears it. Sets status 'published' and published_at (keeping the original published_at on later updates), writes a revision, and records a slug redirect if the slug changed.
- public.schedule_post(post uuid, at timestamptz): requires 'publish'; the time must be in the future.
- public.unpublish_post(post uuid): requires 'publish'; returns the post to draft.
- public.archive_post(post uuid): requires 'publish'; archived posts are hidden publicly but kept.
- public.restore_post_revision(revision uuid): requires 'edit'; for a draft post, replaces its fields; for a published post, puts the revision into draft_changes.
- public.publish_due_posts(): used by the cron job; changes due scheduled posts to 'published' and returns their IDs. Callable only by the service role.

Editing rule: while a post is a draft, saves write to the columns directly. Once a post is published, saves from the editor write only to draft_changes, and the live post changes only when someone with 'publish' clicks Update (publish_post). Staff with 'edit' but not 'publish' can prepare changes that wait for approval.

## Step 4: Rich text
Extend the Phase 4 Tiptap setup into a full post editor, kept as a separate configuration so page rich text sections stay simple:
- Headings (H2 to H4), bold, italic, underline, links, bulleted and numbered lists, blockquote, horizontal rule.
- Images inserted through MediaPicker, with alt text (required) and an optional caption, and a full-width or content-width option.
- YouTube embeds from a pasted URL, rendered with the youtube-nocookie domain and lazy loading.
- A toolbar plus a bubble menu for selected text, a placeholder, and word count with reading time.
- Pasting from Word or Google Docs keeps structure (headings, lists, links, bold, italic) but strips all styling.
- On save, the server renders body_html from the JSON with an allow-list of elements and attributes, extracts body_text, computes reading_minutes, and collects image media IDs for media_references. Client-provided HTML is never trusted or stored.

## Step 5: Admin screens
Protect everything with requireAccess and protectedAction for scope 'blog', and hide controls with usePermissions() when an action is not allowed.
- Posts list (/admin/m/blog): title, status badge (Draft, Scheduled with date, Published, Archived, plus "Unpublished changes" when draft_changes exists), category, author, updated date. Search, filters by status, category, author, and tag, sort, server-side pagination, and bulk actions (change category, archive, delete) limited to allowed actions.
- Post editor (/admin/m/blog/posts/[id]): a distraction-free writing area with a large title field and the body editor, and a sidebar with:
  - Publish panel: status, Publish, Update (for published posts with pending changes), Schedule (date and time picker in the site's timezone; add a timezone field to site settings General tab if it does not exist), Unpublish, Archive, and Discard pending changes.
  - Slug (auto from title until published, then editable with a warning that the old URL will redirect).
  - Category, tags (combobox with inline creation if the user has 'create'), author, featured toggle.
  - Featured image and excerpt (auto-generated from the body if left empty, with a character count).
  - SEO panel: title, description, share image, and a search result preview.
  - Revision history drawer with preview and restore.
  Autosave with the same saving states and leave warning as the page editor. A Preview button opens /preview/blog/[id], protected with blog 'view', noindex, showing the draft or pending changes with a preview bar.
- Categories, Tags, and Authors pages: list, create, edit, delete (blocked with a clear message when posts still use the item, with an option to reassign posts first), and drag reorder for categories. Authors can be linked to a staff profile.

## Step 6: Public pages
All public routes use requireModulePublic('blog'), read only publicly visible posts, match the site design and theme tokens, and work at 390px and 1440px:
- /blog: a page header (eyebrow, heading, intro from module settings), a large featured post card when a featured post exists, category filter chips, a grid of post cards in the docs/design/ "Ideas worth sharing" style (three columns on desktop, one on mobile), search (?q=, using the full-text index, with a clear "no results" state), and pagination.
- /blog/[slug]: category eyebrow, title (the page's h1), author with avatar, date, reading time, featured image with caption, the body styled with @tailwindcss/typography customized to the theme tokens and fonts, an optional table of contents for posts with three or more H2 headings (setting), tags, share links (copy link, LinkedIn, X, Facebook, email, as plain links with no third-party scripts), an author bio box, up to three related posts from the same category, and an optional end-of-post CTA from module settings rendered with the Phase 4 CTA banner component.
- /blog/category/[slug], /blog/tag/[slug], and /blog/author/[slug] listing pages with the same card grid and pagination.
- Old slugs in blog_slug_redirects return a permanent redirect to the current URL.
- /blog/rss.xml with the latest 20 posts (when RSS is enabled in settings), and an RSS link tag on blog pages.
- Metadata for every page: title, description, canonical URL, Open Graph with the share image (falling back to the featured image, then the site default), and BlogPosting JSON-LD on post pages.
- Cache with tags blog-posts and blog-post:<id>, revalidated on publish, update, unpublish, archive, schedule, cron publishing, settings changes, and module toggles. Also set a short time-based revalidation on blog pages as a safety net for scheduled posts.

## Step 7: Scheduled publishing
Create /api/cron/blog-publish, protected by a CRON_SECRET env var (add it to env.ts as optional and to .env.example). It calls requireModuleEnabled('blog') and does nothing when disabled, then runs publish_due_posts with the admin client and revalidates the affected tags. Add it to vercel.json as a cron job every 15 minutes, and document in the README that Vercel's Hobby plan only allows daily cron jobs, in which case scheduled posts still appear on time through the RLS rule and time-based revalidation, just with up to a few minutes' delay in cached lists.

## Step 8: Homepage feed provider
Replace the blog placeholder feed provider with a real one: it returns the latest publicly visible posts (featured posts first if the section option asks for it) as cards with image, category, date, title, and link, and accepts an optional category filter. Add those two options (featured first, category) to the module feed section's editor when the blog source is selected. The seeded homepage's "Ideas worth sharing" section should now show real posts when the module is enabled.

## Step 9: Module settings
Settings schema (edited on the Phase 5 module settings screen): blog eyebrow, heading, and intro for /blog; posts per page; show author; show reading time; show table of contents; enable RSS; default category; and an end-of-post CTA (on or off, eyebrow, heading, button link and label).

## Step 10: Seed content
In a migration, seed categories Strategy, Leadership, and Insights; an author "North / Co Team"; and the three posts from docs/design/ ("The questions every growing business should ask" in Strategy, "Making space for better decisions" in Leadership, and "A simpler way to think about what comes next" in Insights) as published posts with dates matching the design, short excerpts, and a few paragraphs of placeholder body text with at least two H2 headings each. Extend seed/media/manifest.json and pnpm seed:media so the three insight images become the posts' featured images. The module stays disabled by default like all modules.

## Step 11: Tests
Follow the checklist, including:
- Vitest: slug generation, excerpt generation, reading time, the HTML allow-list renderer (strips scripts, event handlers, styles, and unknown elements), the paste cleaner, and RSS output.
- pgTAP: every role against every blog table with the module enabled and disabled; scheduled posts become visible exactly at publish_at; staff with 'edit' but not 'publish' cannot publish, schedule, archive, or change status directly, and their edits to a published post go to draft_changes only; publish_post applies draft_changes, writes a revision, and records a slug redirect; publish_due_posts cannot be called by authenticated users; deleting a category in use is blocked.
- Playwright:
  - Write a post with a heading, an image with alt text, and a YouTube link; publish it; see it on /blog, its category page, and the homepage feed.
  - Edit the published post as a staff member with only 'edit'; the live post does not change; a staff member with 'publish' clicks Update and it does.
  - Schedule a post a minute ahead and confirm it appears after that time.
  - Change a published post's slug; the old URL redirects.
  - Search finds a post by a word in its body.
  - Disable the module: /blog, post pages, and RSS return 404, the homepage feed and header Insights link disappear, and the data is back when re-enabled.
  - Blog list and post pages at 390px and 1440px, with screenshot baselines.

## Step 12: Documentation
- Update CLAUDE.md: the blog's data model and editing rule (draft_changes), the post editor Tiptap configuration and how to reuse it, the sitemapEntries manifest field, the cron pattern (secret, module check, revalidation), and "Current state." Apply any fixes to the "How to build a module" checklist found during this phase.
- Write docs/phases/phase-6.md.
- In README.md, add CRON_SECRET to the per-client env var list and describe the cron job.

## Done when
- Staff can write, schedule, publish, update, archive, and restore posts with the permissions working in both the app and RLS.
- The public blog, post pages, category, tag, and author pages, search, RSS, and the homepage feed all work and match the site design at mobile and desktop widths.
- Disabling the module hides everything and blocks all changes while keeping the data.
- All tests pass locally and in CI, along with lint, typecheck, and build.

When finished, report: what was built, any deviations and why, any changes you made to the module checklist, and anything I should check by hand.