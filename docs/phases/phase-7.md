# Phase 7: Photo gallery module

## Context
Read CLAUDE.md and docs/phases/phase-0.md through phase-6.md first and follow every rule in CLAUDE.md. Follow the "How to build a module" checklist step by step, and fix the checklist if anything in it proves unclear or wrong.

The module's key is 'photo_gallery', its public base path is /gallery, and it uses the actions view, create, edit, delete, and publish. Its manifest and placeholder pages already exist from Phase 5. Photos are media library assets (Phase 3), so this module organizes and displays images rather than storing its own files.

Work through the steps in order, commit after each step, and stop at the end to report back.

## Out of scope for this phase
No private client galleries tied to registered user accounts, no client proofing or favorites, no watermarking, no print sales. Albums can be public or unlisted (viewable only with a secret link). Allowed new dependencies: sharp (image processing), exifr (reading camera details), and yet-another-react-lightbox (accessible lightbox with swipe and keyboard support). Ask before adding anything else.

## Step 1: Scaffold
Run pnpm module:new photo_gallery and build on the generated files. Complete the manifest: admin nav (Albums, Collections), settingsSchema (Step 8), getDataSummary (albums by status and total photos), sitemapEntries (public published albums and collections), section types from Step 7, and a feed provider for the latest albums.

## Step 2: Media processing upgrade (platform-wide)
Improve the Phase 3 upload confirmation step for all image uploads, not just the gallery:
- Add columns to public.media_assets: placeholder (a tiny blurred data URL), taken_at, camera jsonb (make, model, lens, focal length, aperture, shutter speed, ISO), and processed_at.
- On confirm, a server step downloads the original from storage, reads camera details and the capture date with exifr, then uses sharp to auto-rotate by orientation, strip all metadata (including GPS location, for privacy), and re-upload the cleaned file to the same path. It then records dimensions, the blur placeholder, and the camera fields. Set a suitable maxDuration on this route or action for large images.
- If processing fails, keep the upload, mark processed_at as null, and show a "Reprocess" action in the media detail drawer.
- Add pnpm media:backfill to process existing assets that have no