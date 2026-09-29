# Phase 0: Foundation

**Status:** complete (2026-09-29)

Sets up the reusable project foundation. No database tables, auth, roles, admin portal, homepage
sections, or module features yet.

## What was built

| Step | Result                                                                                                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Next.js 16.3.7 (App Router, Turbopack, `src/`, `@/` alias), TypeScript strict + `noUncheckedIndexedAccess`, Tailwind v4, shadcn/ui with 9 components, ESLint + Prettier (tailwind plugin, eslint-config-prettier). Node 24 LTS pinned.  |
| 2    | `(public)` and `(admin)/admin` route groups, `src/core`, `src/modules` (with boundary README), `src/lib`, `components/shared`, `supabase/`, `docs/phases/`. App-level `not-found`, `error`, `loading`.                                  |
| 3    | `src/core/env.ts`: Zod schemas split into client (`NEXT_PUBLIC_`) and server-only; one readable error listing every problem; server keys throw if read in the browser; `getIntegrationStatus()`; `SKIP_ENV_VALIDATION`. `.env.example`. |
| 4    | Supabase browser, server, and admin (`server-only`) clients typed with `Database`; `src/proxy.ts` session refresh; `supabase init`; `db:*` scripts; baseline migration (`pgcrypto`, `citext`).                                          |
| 5    | `GET /api/health`: status, Vercel commit SHA, Supabase auth reachability. Status line on `/admin`.                                                                                                                                      |
| 6    | Inter via `next/font`; permanent theme tokens in `globals.css` wired into Tailwind and shadcn; `dark` button variant; token demo on the home page.                                                                                      |
| 7    | Vitest (env tests), Playwright smoke tests at 1440px and 390px, GitHub Actions CI.                                                                                                                                                      |
| 8    | Production build verified; README "Deploying a client site" guide.                                                                                                                                                                      |
| 9    | `CLAUDE.md` rulebook and this file.                                                                                                                                                                                                     |

## Decisions

- **Next.js 16 `proxy.ts`** instead of `middleware.ts`, since Middleware was renamed in v16. It only
  refreshes the Supabase session (via `getClaims()`) and forwards the cache-busting headers
  `@supabase/ssr` provides. `/api/health` and static assets are excluded from its matcher.
- **Supabase key names** follow current Supabase docs: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
  `SUPABASE_SECRET_KEY`. Legacy `anon` and `service_role` keys also work in those variables.
- **Env validation runs at startup.** `next.config.ts` imports `src/core/env.ts`, so `next dev` and
  `next build` fail immediately with the full list of problems. `pnpm typecheck` sets
  `SKIP_ENV_VALIDATION=1` only for `next typegen`, which loads the config but needs no secrets.
- **`VERCEL_GIT_COMMIT_SHA`** is part of the env schema (optional, server-only) so the health route
  also reads it through `env.ts`.
- **Health route returns 200 whenever the app is up**, with `status: "degraded"` if Supabase is
  unreachable. This keeps liveness separate from dependency health. It uses a 3-second timeout and
  `Cache-Control: no-store`.
- **Theme tokens**: brand tokens (`background`, `foreground`, `muted`, `navy`, `accent`,
  `accent-foreground`, `border`, `radius`) are the permanent names. shadcn's `primary`, `ring`,
  `card`, and so on are derived from them, so the default shadcn button is the coral accent.
  Supporting tokens: `muted-foreground`, `navy-foreground`, `success`, `destructive`. Colors were
  sampled from the reference PNG: navy `#0a102a`, coral `#ed573d`, text `#121729`, secondary text
  `#5f6471`, light section `#fafafa`, border `#e9eaed`, near-square `radius` `0.125rem`.
- **Dark mode tokens removed.** shadcn's `.dark` palette was dropped because the design has no dark
  mode. Dark sections use the `navy` token instead.
- **Font: Inter.** The reference images were rendered with DejaVu Sans (a system fallback, not a
  web font). Inter is the closest clean, widely supported match for its proportions.
- **shadcn `base-nova` style** (Base UI primitives), the current shadcn default. Components use
  shadcn's `cn` package (from shadcn-ui) instead of `clsx` + `tailwind-merge`.
- **Supabase CLI as a dev dependency** (`supabase` npm package), so the `db:*` scripts work without
  a global install.
- **`database.types.ts` written by hand** in the CLI's output format for the empty `public` schema,
  because Docker was not available to run `supabase gen types --local`. Regenerate it with
  `pnpm db:types` once Docker is available. It should be identical apart from formatting.
- **ESLint** treats `_`-prefixed unused variables as intentional.

## Verified

- `pnpm lint`, `typecheck`, `format:check`, `test`, `build` (with `SKIP_ENV_VALIDATION=1`), and
  `test:e2e` pass locally.
- Missing env vars stop `next build` and `next dev` with the list of missing names.
- Importing `@/core/supabase/admin` from a Client Component fails the build ("'server-only' cannot
  be imported from a Client Component module").
- `/api/health` returns 200 with the expected JSON. Supabase reachability against a real project
  still needs to be confirmed with real keys.
