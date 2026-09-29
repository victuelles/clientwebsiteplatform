# Phase 0: Project foundation for the Modular Website Platform

## Context

We are building one reusable Next.js codebase that will be deployed separately for each client. Each deployment has its own Supabase project, branding, content, and enabled modules. Optional modules (built in later phases): blog, photo gallery, video gallery, shop, business directory, inventory, CRM, booking, email marketing. The homepage will be built from editable sections. The visual reference for the default homepage is in docs/design/homepage-desktop.png and docs/design/homepage-mobile.png.

This phase sets up the foundation only. Work through the steps in order, commit after each step with a clear message, and stop at the end of the phase to report back.

## Out of scope for this phase

Do not create database tables, auth screens, roles, the admin portal, homepage sections, or any module features. Do not install Stripe, Resend, or Mux SDKs yet. Do not add dependencies beyond those listed here without asking me first.

## Step 1: Create the app

- Use the latest stable Next.js with the App Router, TypeScript, Tailwind CSS (v4, CSS-first config), ESLint, and a src/ directory. Use pnpm and pin the Node version (current LTS) in .nvmrc and package.json "engines".
- Enable TypeScript strict mode plus noUncheckedIndexedAccess. Use the @/ path alias for src/.
- Initialize shadcn/ui and add these components: button, card, input, label, sonner, dropdown-menu, sheet, separator, skeleton.
- Add Prettier with the Tailwind class-sorting plugin, and make ESLint and Prettier not conflict.

## Step 2: Folder structure

Create this layout (use .gitkeep or a short README where a folder is empty):

- src/app/(public)/ — public site routes, with a placeholder layout and home page
- src/app/(admin)/admin/ — admin routes, with a placeholder layout and dashboard page
- src/app/api/health/ — health check route (Step 5)
- src/core/ — platform code shared by everything (env, supabase, auth, settings, sections, modules registry later)
- src/core/supabase/ — Supabase clients
- src/modules/ — one folder per optional module in later phases; add a README explaining that each module will own its routes, components, server actions, and registry entry, and must never be imported directly by core code except through the module registry
- src/components/ui/ — shadcn components
- src/components/shared/ — shared site components (empty for now)
- src/lib/ — small generic utilities
- supabase/ — Supabase CLI config and migrations
- docs/design/ — reference images (already present)
- docs/phases/ — one markdown file per phase describing what was built

Add app-level not-found.tsx, error.tsx, and loading.tsx with simple, clean placeholders.

## Step 3: Environment validation

Create src/core/env.ts using Zod that validates environment variables once, separates server-only variables from NEXT_PUBLIC ones, and throws a clear error listing every missing or invalid variable.

Required now:

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (use the key naming the current Supabase docs recommend; if they still use the anon key, name it accordingly and note it in the README)
- SUPABASE_SECRET_KEY (server only; the service role / secret key)

Optional now, required in later phases:

- SUPER_ADMIN_EMAIL
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- RESEND_API_KEY, RESEND_FROM_EMAIL
- MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_WEBHOOK_SECRET

Also export an integrations helper that returns whether Stripe, Resend, and Mux are each fully configured (all their keys present), so later phases can show integration status and hide features cleanly.

Support SKIP_ENV_VALIDATION=1 so CI can lint and build without real secrets. All other code must read env vars only through env.ts, never process.env directly. Create .env.example with every variable and a one-line comment for each.

## Step 4: Supabase setup

- Install @supabase/supabase-js and @supabase/ssr.
- Create three clients in src/core/supabase/:
  - browser client for client components
  - server client for server components, server actions, and route handlers, using Next.js cookies correctly for the installed Next.js version
  - admin client using the secret key, for webhooks and trusted server tasks only; it must import "server-only" so it can never be bundled for the browser
- Add session refresh using middleware.ts or proxy.ts, whichever the installed Next.js version uses. Keep it limited to refreshing the Supabase session; do not add route protection yet.
- Run supabase init. Add package.json scripts for starting and stopping local Supabase, creating a new migration, pushing migrations, resetting the local database, and generating TypeScript types into src/core/supabase/database.types.ts.
- Create a first baseline migration that only enables the extensions we will need (pgcrypto, and citext for case-insensitive emails). No tables.
- Generate types and type all three clients with the generated Database type.

## Step 5: Health check

Create GET /api/health that returns JSON with app status, the current commit SHA if available from Vercel env, and whether Supabase is reachable (call the Supabase auth health endpoint using the project URL and publishable key). It must never expose secrets. Show a small status line on the placeholder admin dashboard using this route.

## Step 6: Base styling placeholders

- Load the fonts with next/font. Pick a clean sans-serif that matches the reference images as closely as possible.
- In the global CSS, define theme tokens as CSS variables with names we will keep permanently: background, foreground, muted, navy (dark section color), accent (the coral-orange), accent-foreground, border, and radius. Approximate the colors from the reference images for now and mark them with a TODO; Phase 3 will make them editable per client.
- Wire these tokens into Tailwind and into the shadcn theme so shadcn components use them.
- The placeholder public home page should show the site name, one accent button, and one dark button, just to prove the tokens work. Do not build the real homepage.

## Step 7: Testing and CI

- Set up Vitest with one unit test for env.ts (valid env passes, missing required variable fails with a readable message).
- Set up Playwright with one smoke test: the home page loads and /api/health returns 200.
- Add package.json scripts: dev, build, start, lint, typecheck, format, format:check, test, test:e2e.
- Add a GitHub Actions workflow that runs install, lint, typecheck, format:check, unit tests, and build (with SKIP_ENV_VALIDATION=1) on every push and pull request.

## Step 8: Deployment readiness

- Confirm the app builds with pnpm build.
- Write a "Deploying a client site" section in README.md covering: one Vercel project per client, all pointing at this same repository; one Supabase project per client; which env vars to set in Vercel; how to run migrations against a client's Supabase project; and how to verify with /api/health.

## Step 9: CLAUDE.md

Create CLAUDE.md at the repo root. It is the permanent rulebook for every future session. Include:

- Project summary: one codebase, deployed per client, separate Supabase project per client, optional modules, editable homepage sections.
- Tech stack with the versions actually installed.
- Folder structure and what belongs where, especially the core vs modules boundary.
- Rules:
  - Read env vars only through src/core/env.ts.
  - Never use the admin Supabase client in client components or for normal user requests.
  - Every new table must have Row Level Security enabled in the same migration that creates it, with policies written at the same time.
  - All schema changes go through migrations in supabase/migrations; regenerate types after each one.
  - Every admin page, server action, and route handler will check module status, role permission, and record ownership through a single shared access guard (built in Phase 2); do not write ad hoc permission checks.
  - Disabled modules hide their UI and block new operations but never delete data.
  - UI must match docs/design/ at mobile (390px) and desktop (1440px) widths; use shadcn components and the theme tokens, never hard-coded colors.
  - Keep secrets out of the database; integration keys live in env vars.
- Commands for dev, tests, migrations, and type generation.
- A "Current state" section that says Phase 0 is complete and lists what exists. Future phases update this section at the end.
- A "Phase roadmap" list: 0 Foundation, 1 Core database/auth/roles, 2 Access control and admin shell, 3 Branding/settings/media library, 4 Homepage section builder and pages, 5 Module framework, 6 Blog, 7 Photo gallery, 8 Video gallery, 9 CRM, 10 Email marketing, 11 Shop, 12 Inventory, 13 Booking, 14 Business directory, 15 Hardening, 16 Client deployment kit.

Also write docs/phases/phase-0.md summarizing what was built and any decisions made.

## Done when

- pnpm dev runs, the placeholder home and admin pages render, and /api/health reports Supabase as reachable.
- Removing a required env var stops the app with a clear list of what is missing.
- lint, typecheck, format:check, unit tests, e2e smoke test, and build all pass locally, and the CI workflow passes.
- The admin Supabase client cannot be imported into a client component without a build error.
- README.md, CLAUDE.md, .env.example, and docs/phases/phase-0.md are complete.

When finished, give me a short report: what was built, any deviations from these instructions and why, the exact env vars I need to set in Vercel, and anything I need to do manually.
