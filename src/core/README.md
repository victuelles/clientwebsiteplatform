# src/core

Platform code shared by every deployment and every module.

- `env.ts` — the only place environment variables are read.
- `supabase/` — browser, server, and admin Supabase clients plus generated database types.
- Later phases add: `auth/`, `settings/`, `sections/` (homepage section builder), and the module registry.

Core code must never import from `src/modules/*` directly. It only talks to modules through the
module registry (Phase 5).
