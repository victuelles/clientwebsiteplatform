# Phase 10: Transactional email, background jobs, and email marketing module

## Context
Read CLAUDE.md and docs/phases/phase-0.md through phase-9.md first and follow every rule in CLAUDE.md. Follow the "How to build a module" checklist for Part B, and fix the checklist if anything in it proves unclear or wrong.

This phase has two parts. Do Part A completely (with its tests and docs) and stop to report before starting Part B.
- Part A builds platform features every module will use: a background job queue, a shared transactional email service with branded React Email templates, and branded auth emails.
- Part B builds the email marketing module. Its key is 'email_marketing', it requires the 'crm' module and the 'resend' integration, and it uses the actions view, create, edit, delete, publish (send or schedule campaigns), and export.

The CRM contact is the single source of truth for a person. Email marketing adds lists, campaigns, and delivery tracking on top of CRM contacts, and interacts with the CRM only through the CRM service.

## Out of scope for this phase
No multi-step automations or drip sequences (only a single welcome email), no A/B testing, no SMS, no drag-and-drop freeform email design (the editor is block-based). Allowed new dependencies: @react-email/components and react-email (for local template previews), and the standard-webhooks or svix package for verifying webhook signatures. Ask before adding anything else.

---

# Part A: Platform email and background jobs

## A1: Background job queue
Serverless functions cannot run long tasks, so create a small database-backed job queue:
- Migration: public.jobs with id, type, payload jsonb, run_at, status ('queued', 'running', 'done', 'failed', 'cancelled'), attempts, max_attempts, locked_at, locked_by, last_error, created_at, finished_at, and a dedupe_key (unique when not null). No access for anon or authenticated; only the admin client uses it. The super admin can read it through a security definer view for the admin.
- A security definer function public.claim_jobs(worker_id, limit) that claims due jobs using FOR UPDATE SKIP LOCKED and also frees jobs whose lock is older than 10 minutes.
- A worker route POST /api/jobs/worker, protected by CRON_SECRET, that claims jobs and runs them within a time budget safely under the function's maxDuration, then returns. Failed jobs retry with exponential backoff until max_attempts, then become 'failed' with the error.
- Add a jobHandlers field to ModuleManifest so modules register handlers by job type; core handlers are registered in src/core/jobs/. A handler for a disabled module's job type leaves the job queued and logs why (it resumes when re-enabled), unless the handler says it must run anyway (such as delivery status updates).
- enqueueJob(type, payload, { runAt, dedupeKey, maxAttempts }) for server code, and a helper that also triggers the worker immediately after the response using Next.js after().
- Triggering: use Supabase pg_cron with pg_net to call the worker every minute (write the migration and document enabling the extensions and storing the site URL and secret in Supabase Vault), so jobs run reliably on any Vercel plan. Keep the Phase 6 and Phase 8 cron jobs as they are, but make them enqueue jobs instead of doing the work directly if that is simpler.
- A super admin page /admin/jobs showing recent jobs by status with errors, and retry and cancel buttons.

## A2: Transactional email service
- Create src/core/email/ with sendEmail({ template, to, data, replyTo, tags, idempotencyKey }) that renders a React Email template to HTML and plain text and sends through Resend, and a Resend client interface with real and fake implementations (RESEND_FAKE=1 for tests, which stores sent emails so tests can read them), following the Mux client pattern from Phase 8.
- A shared branded EmailLayout: logo from site settings (with the text fallback), theme accent and navy colors, fonts with safe email fallbacks, a footer with the site name, contact details, and social links. Keep it simple and compatible with major email clients (tables for layout, inline styles, no web fonts required).
- Move every existing email into templates: the contact form notification (Phase 4), the CRM new submission notification (Phase 9), and the integration test email (Phase 3).
- If Resend is not configured, sendEmail logs and returns a clear "not configured" result instead of throwing, and the Integrations page already shows the missing keys.
- Send non-urgent emails through the job queue (type 'email.send') so a slow provider never slows down a page.
- Record hard bounces and complaints for transactional emails in the suppression table from B2 once Part B exists; for now, leave a TODO.
- Add a pnpm email:dev script that previews all templates with sample data.

## A3: Branded auth emails
Implement the Supabase Auth "Send Email" hook as an HTTPS endpoint (/api/auth/email-hook), verifying the hook signature with a SEND_EMAIL_HOOK_SECRET env var, so sign-up confirmation, magic link, password reset, email change, and staff invite emails are sent through sendEmail with branded templates. Links must use the token_hash confirm flow from Phase 1. Document how to enable the hook per client in the Supabase dashboard, and keep the Phase 1 SMTP setup as the fallback if the hook is not enabled.

## A4: Part A tests and docs
- Vitest: job retry and backoff logic, claim behavior with concurrent workers (integration test against the local database), template rendering snapshots for every template, the email hook signature check.
- pgTAP: jobs are not accessible to anon, users, or staff; claim_jobs never gives the same job to two workers.
- Playwright: sign up and receive a branded confirmation email (read from the fake client), submit the contact form and see the notification email queued and sent.
- Update CLAUDE.md with the job queue (how to enqueue, how modules register handlers, disabled-module behavior), sendEmail and EmailLayout, how to add a template, and the auth email hook. Update the README per-client setup with pg_cron/pg_net, Vault secrets, SEND_EMAIL_HOOK_SECRET, and the hook setup. Write docs/phases/phase-10a.md.

Stop here and report before starting Part B.

---

# Part B: Email marketing module

## B1: Scaffold
Run pnpm module:new email_marketing and build on the generated files. Complete the manifest: admin nav (Dashboard, Campaigns, Lists, Subscribers, Templates), settingsSchema (B11), getDataSummary (subscribers, lists, campaigns by status), section types (B6), job handlers (B8), a service (B10), and getHealth (warn when the sending domain is not verified in Resend, the mailing address is missing, the webhook secret is missing, or no webhook has arrived in 7 days after a send).

## B2: Database migration
Using the module table template (staff and super admin only, except the public functions below), create:
- public.email_lists: id, name, description, is_default (lists new subscribers join by default), is_public (shown on signup forms and the preference center), sort_order, timestamps.
- public.email_list_members: list_id, contact_id (references crm_contacts), status ('pending', 'subscribed', 'unsubscribed'), source, subscribed_at, unsubscribed_at, primary key on both.
- public.email_contact_tokens: contact_id (primary key), token (random, unique), created_at. Used for unsubscribe and preference links; regenerable.
- public.email_suppressions: email (citext primary key), reason ('hard_bounce', 'complaint', 'manual'), created_at, note. Suppressed addresses never receive marketing email, and hard bounces never receive transactional email either.
- public.email_templates: id, name, blocks jsonb, is_system, timestamps.
- public.email_campaigns: id, name, subject, preview_text, from_name, from_email, reply_to, blocks jsonb, audience jsonb (list IDs, optional CRM saved view ID, excluded tag IDs), status ('draft', 'scheduled', 'sending', 'paused', 'sent', 'cancelled', 'failed'), scheduled_at, started_at, sent_at, recipient_count, stats jsonb (cached counts), created_by, updated_by, timestamps.
- public.email_campaign_recipients: id, campaign_id, contact_id, email, first_name, status ('queued', 'sent', 'delivered', 'delayed', 'bounced', 'complained', 'failed', 'skipped'), resend_email_id (unique when not null), error, sent_at, delivered_at, first_opened_at, open_count, first_clicked_at, click_count, unsubscribed_at. Unique (campaign_id, email). Indexes on campaign_id with status, and contact_id.
- public.email_link_clicks: recipient_id, url, clicked_at.
- public.email_webhook_events: id (provider event ID primary key), type, received_at, processed_at, error.

Security definer functions (search_path = '', audit entries where noted):
- em_subscribe(email, first_name, list_ids, source): callable by anon; checks module_enabled, calls the CRM upsert (source 'newsletter'), creates list memberships as 'pending' (double opt-in on) or 'subscribed', and returns whether a confirmation email is needed. Only public lists can be joined this way.
- em_confirm_subscription(token): callable by anon; marks pending memberships subscribed and sets the contact's email_consent to 'subscribed' with source and time.
- em_get_preferences(token) and em_update_preferences(token, list_statuses jsonb, unsubscribe_all boolean): callable by anon with a valid token.
- em_unsubscribe_all(token): callable by anon; unsubscribes every list and sets email_consent to 'unsubscribed'.
- Status changes to scheduled, sending, paused, and cancelled go through functions requiring can('email_marketing', 'publish').

Unsubscribing must keep working even when the module is disabled, because people who received an email must always be able to opt out. The preference and unsubscribe functions and pages are the one exception to the disabled rule; document this in CLAUDE.md. Subscribing and all sending are blocked when disabled.

Every subscribe, confirm, unsubscribe, bounce, and complaint records a CRM activity (type 'subscription') through the CRM service.

## B3: Email content blocks
Create a block registry for email content (similar to page sections, reusing the Phase 4 form generator):
- Heading, text (the simple Tiptap configuration, with merge tags), image (MediaPicker, alt text required, optional link), button (label, Link, alignment), divider, spacer, image and text side by side (stacks on mobile), social links (from site settings), and a quote.
- Module-powered blocks through module services, available only when those modules are enabled: blog posts (pick specific posts or "latest N," rendered as cards with image, category, title, excerpt, and link) and video (thumbnail with a play icon linking to the video page).
- Merge tags: {{first_name}} with a fallback syntax ({{first_name|there}}), {{site_name}}, and the required {{unsubscribe_url}} and {{preferences_url}}.
- Render with React Email into the Part A EmailLayout plus a marketing footer that always includes the mailing address from settings and unsubscribe and preference links. Staff cannot remove the footer.
- Produce both HTML and plain text.

## B4: Admin screens
Protect everything with requireAccess and protectedAction for scope 'email_marketing', and hide controls the user cannot use.
- Dashboard: subscribers (total, new this month, unsubscribed this month), subscriber growth chart, recent campaigns with open and click rates, and health warnings.
- Lists: create, edit, reorder, set default and public, see member counts by status, and delete (only when empty or after confirming members will be removed from that list only).
- Subscribers: a table of contacts with list memberships, consent status, and suppression status, with filters (list, status, source, date), search, add a subscriber manually (requires confirming the person agreed, recorded as consent source), unsubscribe, move between lists, open in CRM, and export (requires 'export', audited).
- Suppressions: view, add manually, and remove (with a warning).
- Templates: two seeded system templates (Newsletter and Announcement, styled to the brand), create templates from scratch or from a campaign, edit with the block editor, duplicate, delete (not system ones).
- Campaigns list: name, status, audience size, sent date, open rate, click rate; filters and search; duplicate a campaign.
- Campaign editor:
  - Setup: name, subject (with a character count), preview text, from name and email (the domain must be verified in Resend; check through the Resend domains API and show a clear error if not), reply-to.
  - Audience: pick lists, optionally narrow with a CRM saved view (using the CRM service's filter format), and exclude tags. Show a live recipient count after removing unsubscribed, suppressed, pending, and duplicate addresses.
  - Content: the block editor with a live preview at desktop and mobile widths, and a plain-text preview.
  - Send test: send to up to five addresses (defaulting to the current user), with merge tags filled from a chosen sample contact.
  - Review: a pre-send checklist that must pass (subject set, verified from address, mailing address set in settings, audience not empty, all images have alt text, all links valid, a test email sent after the last content change), then Send now or Schedule (date and time in the site timezone), both requiring 'publish', with a confirmation showing the recipient count.
  - While sending: progress (queued, sent, failed), with Pause, Resume, and Cancel.
  - After sending: a report with sent, delivered, unique opens and open rate (with a note that some email apps make opens unreliable), unique clicks and click rate, bounces, complaints, unsubscribes, a per-link click table, and a recipient table with each person's status and a link to their CRM contact.
- From the blog: add a "Send to subscribers" action on published blog posts (shown only when email marketing is enabled, through module services) that creates a draft campaign using the Newsletter template with that post's block filled in.

## B5: Sending
- Sending runs as jobs (B8). When a campaign starts, build the recipient snapshot in email_campaign_recipients from the audience at that moment: contacts with email_consent 'subscribed', a 'subscribed' membership in at least one chosen list, not suppressed, not excluded, deduplicated by email.
- Send in batches of up to 100 through the Resend batch API, respecting Resend's rate limits (read the current limits from their docs and make the rate a setting), with an idempotency key per batch so retries never double-send.
- Each email is personalized with merge tags and includes List-Unsubscribe and List-Unsubscribe-Post headers pointing to the one-click unsubscribe endpoint, plus tags for the campaign and recipient IDs.
- Pausing stops after the current batch; cancelling marks remaining recipients 'skipped'. A crashed job resumes where it left off.
- Scheduled campaigns start when due through the job queue.

## B6: Public pages and sections
- Newsletter signup section (registered through the manifest with requiresModule 'email_marketing'): eyebrow, heading, text, which public lists to offer (or join default lists silently), optional first name field, button label, success message, and a privacy note with a link. Styled to fit the site's section backgrounds.
- An optional footer signup strip controlled by a module setting, placed above the Phase 3 footer when the module is enabled.
- Both forms use a server action with a honeypot and per-IP rate limit, call em_subscribe, send the confirmation email when needed, work without JavaScript, and always show the same success message whether or not the email already existed.
- /email/confirm/[token]: confirms the subscription, shows a branded thank-you page, and sends the welcome email if enabled.
- /email/preferences/[token]: shows public lists with toggles and an "Unsubscribe from everything" button.
- /email/unsubscribe/[token]: GET shows a confirmation page with one button; POST (used by one-click List-Unsubscribe) unsubscribes immediately and returns 200.
- All these pages are noindex and work even when the module is disabled, except confirming new subscriptions, which is blocked when disabled.

## B7: Resend webhook
Create POST /api/webhooks/resend following the webhook pattern from Phase 8: verify the signature with RESEND_WEBHOOK_SECRET (add to env.ts and .env.example), use email_webhook_events for idempotency, and match events to campaign recipients by Resend email ID. Handle sent, delivered, delivery delayed, bounced (hard bounces add a suppression), complained (unsubscribe from everything and add a suppression), opened, and clicked (record in email_link_clicks). Update cached campaign stats efficiently. These events are always recorded, even when the module is disabled, because they describe emails already sent. Also record hard bounces and complaints for transactional emails from Part A and remove that TODO.

## B8: Job handlers
Register: 'email_marketing.start_campaign' (build the snapshot), 'email_marketing.send_batch', 'email_marketing.finish_campaign' (final stats and status), 'email_marketing.send_confirmation', and 'email_marketing.send_welcome'. Campaign sending jobs do not run while the module is disabled; they wait and resume when re-enabled.

## B9: Compliance and deliverability
- Sending is blocked until a mailing address is set in module settings, and every marketing email shows it.
- Only contacts with recorded consent receive marketing email.
- Document in the README: verifying each client's sending domain in Resend with SPF, DKIM, and DMARC; using a from address on that domain; enabling open and click tracking in Resend if wanted; creating the webhook (URL <site>/api/webhooks/resend) and copying its signing secret; and a short plain-language note on consent and unsubscribe rules (CAN-SPAM, and GDPR for EU contacts). This is guidance, not legal advice.

## B10: Service
Expose through the module service: createCampaignFromPost(postId) (used by the blog action), subscribe({ email, firstName, listIds, source }) (for other modules, such as a "subscribe to our newsletter" checkbox at shop checkout or booking in later phases, which must pass only when the person ticked it), and getSubscriptionStatus(email).

## B11: Module settings
Default from name, from email, and reply-to; mailing address (required to send); double opt-in (on by default, with a warning when turning it off); welcome email (on or off, with its subject and blocks edited in the block editor); footer signup strip (on or off, heading, and lists); sending rate; and default lists for new subscribers.

## B12: Seed content
Seed one default public list "Newsletter" and the two system templates. No subscribers.

## B13: Tests
Follow the checklist, using the fake Resend client:
- Vitest: every block renders valid email HTML and plain text; merge tags with fallbacks; the footer and unsubscribe link cannot be removed; recipient snapshot rules (consent, membership, suppressions, exclusions, deduplication); batch building and idempotency keys; List-Unsubscribe headers; webhook signature verification and event handling; the pre-send checklist.
- pgTAP: every role against every module table in both module states; anon can call only the subscribe, confirm, preference, and unsubscribe functions, and only with valid tokens; unsubscribe functions work while the module is disabled but subscribe and confirm do not; only 'publish' can schedule or start sending; suppressions and consent are enforced.
- Playwright:
  - Subscribe through the homepage section, confirm through the emailed link, receive the welcome email, and see the contact and subscription activity in the CRM.
  - Build a campaign with a heading, text with a first-name merge tag, an image, a button, and a blog post block; send a test; pass the checklist; send; see progress; trigger fake delivered, opened, and clicked webhooks; see the report.
  - One-click unsubscribe (POST) and the preference center both work, and the contact is excluded from the next campaign.
  - A hard bounce suppresses the address.
  - A staff member with 'edit' but not 'publish' can build a campaign but cannot send or schedule it.
  - "Send to subscribers" from a blog post creates a prefilled draft.
  - Pause and resume a campaign mid-send without anyone receiving it twice.
  - Disable the module: signup forms and the admin disappear, sending waits, unsubscribe links still work, and delivery webhooks are still recorded.
  - Campaign editor and the public preference page at 390px and 1440px, with screenshot baselines.

## B14: Documentation
- Update CLAUDE.md: the email marketing data model, consent rules, the unsubscribe exception to the disabled rule, email blocks and how to add one, sending through jobs, the Resend webhook, the module service, and "Current state." Apply any checklist fixes.
- Write docs/phases/phase-10b.md.
- Update the README per-client setup with the Resend domain, webhook, secrets, and mailing address.

## Done when (Part B)
- Staff can manage lists, subscribers, templates, and campaigns, send tests, and send or schedule campaigns that deliver reliably in batches without duplicates.
- Visitors can subscribe with double opt-in and always unsubscribe with one click, even when the module is off.
- Delivery, opens, clicks, bounces, and complaints are tracked, and bounces and complaints protect the sender's reputation automatically.
- Permissions and consent rules hold in both the app and RLS.
- All tests pass locally and in CI, along with lint, typecheck, and build.

When finished, report: what was built, any deviations and why, the exact Resend and Supabase dashboard steps per client, any changes to the module checklist, and anything I should check by hand.