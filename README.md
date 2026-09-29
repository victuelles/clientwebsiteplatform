# Client Website Platform

One reusable Next.js codebase, deployed separately for each client. Each deployment has its own
Supabase project, branding, content, and enabled modules (blog, galleries, shop, directory,
inventory, CRM, booking, email marketing). The homepage is built from editable sections.

Rules for contributors (human or AI) live in [CLAUDE.md](CLAUDE.md). Per-phase notes live in
[docs/phases/](docs/phases/).

## Requirements

- Node.js 24 LTS (see `.nvmrc`; run `nvm use`)
- pnpm 9 (`corepack enable` picks up the version in `package.json`)
- A Docker runtime for local Supabase (`pnpm db:start`), database tests, and e2e tests. Docker
  Desktop, OrbStack, or Colima (`brew install colima docker && colima start`) all work.

The Supabase CLI is a dev dependency; run it with `pnpm exec supabase ...` or the `db:*` scripts.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm db:start                # local Supabase (needs Docker); prints the URL and keys
pnpm dev                     # http://localhost:3000
```

`pnpm db:start` prints the local API URL, publishable key (`sb_publishable_...`), and secret key
(`sb_secret_...`). Put them in `.env.local`. You can also point `.env.local` at a hosted Supabase
dev project instead of running Docker.

Environment variables are validated at startup by `src/core/env.ts`. If anything required is
missing or invalid, `pnpm dev` and `pnpm build` stop with a list of every problem.

> **Supabase key naming.** This project uses Supabase's current API keys:
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) and `SUPABASE_SECRET_KEY`
> (`sb_secret_...`). Projects that still use the legacy JWT keys can put the `anon` key in
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the `service_role` key in `SUPABASE_SECRET_KEY`.

## Local test accounts

`pnpm db:reset` applies all migrations and then `supabase/seed.sql`, which creates these accounts in
the **local** database only:

| Email                     | Password       | Role                              |
| ------------------------- | -------------- | --------------------------------- |
| `superadmin@example.test` | `Password123!` | super_admin                       |
| `staff@example.test`      | `Password123!` | staff (`content`: `view`, `edit`) |
| `user@example.test`       | `Password123!` | user                              |

Emails sent by local Supabase (confirmations, magic links, password resets) appear in Mailpit at
http://127.0.0.1:54324. **Never run `seed.sql` against a client database.**

## Scripts

| Script                       | What it does                                                   |
| ---------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                   | Start the dev server                                           |
| `pnpm build` / `pnpm start`  | Production build / serve it                                    |
| `pnpm lint`                  | ESLint                                                         |
| `pnpm typecheck`             | Generate route types and run `tsc --noEmit`                    |
| `pnpm format`                | Format everything with Prettier                                |
| `pnpm format:check`          | Check formatting (CI)                                          |
| `pnpm test`                  | Vitest unit tests                                              |
| `pnpm test:e2e`              | Playwright e2e tests against local Supabase (`pnpm db:start`)  |
| `pnpm test:db`               | pgTAP database tests in `supabase/tests`                       |
| `pnpm db:start` / `db:stop`  | Start / stop local Supabase (Docker)                           |
| `pnpm db:status`             | Show local Supabase URLs and keys                              |
| `pnpm db:migration:new name` | Create `supabase/migrations/<timestamp>_name.sql`              |
| `pnpm db:reset`              | Rebuild the local database from all migrations                 |
| `pnpm db:push`               | Apply pending migrations to the linked remote project          |
| `pnpm db:types`              | Regenerate `src/core/supabase/database.types.ts` from local DB |
| `pnpm db:types:linked`       | Same, from the linked remote project                           |

## Deploying a client site

Every client gets **one Vercel project** and **one Supabase project**. All Vercel projects point at
this same GitHub repository; they differ only in environment variables (and, from Phase 3 on, in
the settings stored in their own database).

### 1. Create the client's Supabase project

1. In the Supabase dashboard, create a new project for the client. Pick the region closest to their
   visitors.
2. From **Project Settings → API Keys**, copy the project URL, the publishable key, and a secret
   key.
3. Work through the [Supabase Auth configuration per client](#supabase-auth-configuration-per-client)
   checklist below.

### 2. Run migrations against the client's project

Migrations in `supabase/migrations/` are the single source of truth for the schema. Apply them to
each client project:

```bash
pnpm exec supabase login                               # once per machine
pnpm exec supabase link --project-ref <client-ref>     # ref is in the project URL
pnpm db:push                                           # applies pending migrations
```

`supabase link` remembers one project at a time (in `supabase/.temp`, which is git-ignored), so
re-run `link` before pushing to a different client. To avoid linking, you can push with a direct
connection string instead:

```bash
pnpm exec supabase db push --db-url "postgresql://postgres:<password>@db.<client-ref>.supabase.co:5432/postgres"
```

Always run migrations **before** deploying code that depends on them. When a release includes new
migrations, push them to every client project.

### 3. Create the client's Vercel project

1. In Vercel, **Add New → Project**, import this repository. Framework preset: Next.js. Leave the
   build and install commands at their defaults (Vercel detects pnpm from the lockfile and Node 24
   from `package.json` `engines`).
2. Name the project after the client (e.g. `site-acme`).
3. Add the environment variables below for **Production** (and **Preview** if you use previews,
   ideally pointing at a separate Supabase project).
4. Deploy, then add the client's domain under **Settings → Domains**.

| Variable                               | Required   | Value                                                 |
| -------------------------------------- | ---------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Yes        | `https://<client-domain>`                             |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes        | `https://<client-ref>.supabase.co`                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes        | `sb_publishable_...`                                  |
| `SUPABASE_SECRET_KEY`                  | Yes        | `sb_secret_...` (mark as **Sensitive**)               |
| `SUPER_ADMIN_EMAIL`                    | Yes        | The client owner's email (becomes the super admin)    |
| `STRIPE_SECRET_KEY`                    | Shop only  | `sk_live_...` or restricted `rk_live_...` (Sensitive) |
| `STRIPE_WEBHOOK_SECRET`                | Shop only  | `whsec_...` (Sensitive)                               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | Shop only  | `pk_live_...`                                         |
| `RESEND_API_KEY`                       | Email only | `re_...` (Sensitive)                                  |
| `RESEND_FROM_EMAIL`                    | Email only | `Client Name <hello@client-domain>`                   |
| `MUX_TOKEN_ID`                         | Video only | Mux access token ID                                   |
| `MUX_TOKEN_SECRET`                     | Video only | Mux access token secret (Sensitive)                   |
| `MUX_WEBHOOK_SECRET`                   | Video only | Mux webhook signing secret (Sensitive)                |

Never set `SKIP_ENV_VALIDATION` in Vercel. `VERCEL_GIT_COMMIT_SHA` is provided by Vercel
automatically and shown by the health check.

### 4. Verify with `/api/health`

```bash
curl https://<client-domain>/api/health
```

A healthy deployment returns HTTP 200 with:

```json
{
  "status": "ok",
  "commit": "<git sha>",
  "supabase": { "reachable": true, "latencyMs": 42 },
  "timestamp": "..."
}
```

`"status": "degraded"` with `"reachable": false` means the app is up but cannot reach Supabase:
check `NEXT_PUBLIC_SUPABASE_URL`, the publishable key, and that the project is not paused. The
same status line is shown on `/admin`.

## Supabase Auth configuration per client

Do this in each client's Supabase dashboard. Local development gets the same settings from
`supabase/config.toml`.

- [ ] **Site URL** (Authentication → URL Configuration): `https://<client-domain>`.
- [ ] **Redirect URLs** (same page): add `https://<client-domain>/**` and, if you use Vercel
      previews, `https://<vercel-project>-*-<vercel-team>.vercel.app/**`.
      The `/**` pattern also covers `/auth/set-password` (invitations) and `/auth/callback`.
- [ ] **Email confirmations on** (Authentication → Sign In / Providers → Email → "Confirm email").
- [ ] **Password policy** (same page): minimum length **10**, and require lowercase, uppercase
      letters, and digits. This must match the sign-up form's rules.
- [ ] **Custom SMTP with Resend** (Authentication → Emails → SMTP Settings): host
      `smtp.resend.com`, port `465`, username `resend`, password = a Resend API key, sender =
      an address on the client's verified Resend domain (the same as `RESEND_FROM_EMAIL`). The
      built-in Supabase mailer is rate-limited and not meant for production.
- [ ] **Email templates** (Authentication → Emails → Templates): replace the link in each
      template with the token_hash version from `supabase/templates/`:
  - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
  - Magic link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
  - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
  - Change email address:
    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change`
  - Invite user (staff invitations):
    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`. This one is required:
    invitations sent from `/admin/staff` do not work with the default invite template, which
    uses a link format this app does not handle.

  (Default templates still work through `/auth/callback`, but the token_hash links also work
  when the email is opened in a different browser.)

- [ ] **`SUPER_ADMIN_EMAIL`** set in the Vercel project to the owner's email. The owner then
      signs up with that email and confirms it; their first sign-in makes them the super admin.
      Every other sign-up becomes a regular user. Check `/admin` afterwards.

# clientwebsiteplatform
