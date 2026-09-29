// pnpm module:new <key> [--dry-run]
//
// Scaffolds a module that is already in the registry (a module scope with a manifest in
// src/modules/<key>/module.ts): folders, a README, a module.server.ts stub, a migration from
// supabase/templates/module-table.sql, a pgTAP test stub, and a phase notes stub.
// Never overwrites an existing file. See CLAUDE.md, "How to build a module".

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const key = args.find((arg) => !arg.startsWith("--"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!key) fail("Usage: pnpm module:new <key> [--dry-run]");

// Module keys come from the scope list, which mirrors public.permission_scopes.
const scopes = readFileSync(join(root, "src/core/access/scopes.ts"), "utf8");
const moduleKeys = [...scopes.matchAll(/key: "([a-z_]+)"[^}]*kind: "module"/g)].map((m) => m[1]);
if (!moduleKeys.includes(key)) {
  fail(
    `"${key}" is not a module in the registry. Known modules: ${moduleKeys.join(", ")}.\n` +
      "A new module needs a permission scope (migration + src/core/access/scopes.ts) and a " +
      "manifest in src/core/modules/registry.ts first.",
  );
}

const moduleDir = join(root, "src/modules", key);
const manifestPath = join(moduleDir, "module.ts");
const manifest = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "";
const phase = /phase: (\d+)/.exec(manifest)?.[1] ?? "N";
const label = /label: "([^"]+)"/.exec(manifest)?.[1] ?? key;
const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const table = `${key}_items`;

/** @type {{ path: string; content: string }[]} */
const files = [];
const add = (path, content) => files.push({ path: join(root, path), content });

for (const folder of ["components", "actions", "queries", "sections", "admin"]) {
  add(`src/modules/${key}/${folder}/.gitkeep`, "");
}

add(
  `src/modules/${key}/README.md`,
  `# ${label} module

Built in Phase ${phase}. Follow CLAUDE.md, "How to build a module".

| Folder        | Contents                                                           |
| ------------- | ------------------------------------------------------------------ |
| \`module.ts\`   | Manifest (client-safe): routes, nav, actions, dependencies         |
| \`module.server.ts\` | Feed providers, section renderers, data summary, health     |
| \`components/\` | UI used by this module's pages                                     |
| \`actions/\`    | Server actions (\`protectedAction({ scope: "${key}", ... })\`)        |
| \`queries/\`    | Server reads (server client; RLS applies)                          |
| \`sections/\`   | Section definitions contributed through \`sectionTypes\`             |
| \`admin/\`      | Admin page components (routes live in src/app/(admin)/admin/m/${key}) |
`,
);

if (!manifest) {
  add(
    `src/modules/${key}/module.ts`,
    `import { defineModule } from "@/core/modules/types";

// TODO: complete the manifest, then add it to src/core/modules/registry.ts.
export const ${camel}Module = defineModule({
  key: "${key}",
  label: "${label}",
  description: "TODO",
  icon: "star",
  phase: 0,
  actions: ["view", "create", "edit", "delete"],
  publicRoutes: [],
  adminNav: [{ label: "${label}", href: "/admin/m/${key}", icon: "star", action: "view" }],
  accountNav: [],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: [],
  requiredIntegrations: [],
  optionalIntegrations: [],
});
`,
  );
}

add(
  `src/modules/${key}/module.server.ts`,
  `import "server-only";

import { defineModuleServer } from "@/core/modules/types";

// Server parts of the ${label} module. Add it to SERVER_MANIFESTS in
// src/core/modules/registry.server.ts.
export const ${camel}Server = defineModuleServer({
  key: "${key}",
  // feedProviders: [...],        // one per \`feeds\` entry in module.ts
  // sectionRenderers: { ... },   // one per \`sectionTypes\` entry
  // getDataSummary: async () => [{ label: "items", count: 0 }],
  // getHealth: async () => [],
});
`,
);

// Migration: skip when this module already has one from the scaffold.
const migrationsDir = join(root, "supabase/migrations");
const existingMigration = readdirSync(migrationsDir).find((f) => f.endsWith(`_${key}_tables.sql`));
if (!existingMigration) {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const template = readFileSync(join(root, "supabase/templates/module-table.sql"), "utf8");
  const body = template
    .replace(/^-- Module table template:[\s\S]*?\n\n/, "")
    .replaceAll("__module__", key)
    .replaceAll("__table__", table);
  add(
    `supabase/migrations/${stamp}_${key}_tables.sql`,
    `-- ${label} module tables (Phase ${phase}), from supabase/templates/module-table.sql.
-- TODO: rename ${table}, add the module's columns, and keep only the policies it needs.
-- After editing: pnpm db:reset && pnpm test:db && pnpm db:types.

${body}`,
  );
}

// pgTAP stub: next free number.
const testsDir = join(root, "supabase/tests/database");
const tests = readdirSync(testsDir);
if (!tests.some((f) => f.endsWith(`_${key}.test.sql`))) {
  const next = Math.max(0, ...tests.map((f) => Number.parseInt(f, 10) || 0)) + 1;
  const id = (n) => `'d0000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}'`;
  add(
    `supabase/tests/database/${String(next).padStart(2, "0")}_${key}.test.sql`,
    `-- ${label} module: every role with the module on and off.
-- Copy the pattern from 08_module_policy_template.test.sql (tests.attempt / tests.visible):
-- anon, a user, the owner, staff with and without each permission, inactive staff, and the super
-- admin, first with the module on, then off (writes blocked for everyone; super admin reads).
begin;
\\ir ../helpers.psql
select plan(1);

select tests.create_user(${id(1)}, 'admin@t.test', 'super_admin');
select tests.create_user(${id(2)}, 'owner@t.test', 'user');
select tests.create_user(${id(3)}, 'staff@t.test', 'staff');

select has_table('public', '${table}', '${table} exists');
-- TODO: role checks with the module on (update public.modules set enabled = true ...) and off.

select * from finish();
rollback;
`,
  );
}

const notes = `docs/phases/phase-${phase}-notes.md`;
add(
  notes,
  `# Phase ${phase} notes: ${label}

**Status:** in progress. Brief: [phase-${phase}.md](phase-${phase}.md).

## What was built

| Step | Result |
| ---- | ------ |

## Decisions and deviations

## Disabled behavior

- Public routes: \`requireModulePublic("${key}")\` in each public layout.
- Webhooks/tasks: \`requireModuleEnabled("${key}")\` before starting anything new.

## Check by hand
`,
);

const created = [];
const skipped = [];
for (const file of files) {
  const rel = relative(root, file.path);
  if (existsSync(file.path)) {
    skipped.push(rel);
    continue;
  }
  created.push(rel);
  if (!dryRun) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content);
  }
}

console.log(dryRun ? `Dry run for "${key}". Would create:` : `Scaffolded "${key}". Created:`);
for (const rel of created) console.log(`  + ${rel}`);
if (skipped.length) {
  console.log("Already exists (left unchanged):");
  for (const rel of skipped) console.log(`  = ${rel}`);
}
if (!dryRun && created.length) {
  console.log(
    '\nNext: follow CLAUDE.md, "How to build a module" (manifest, migration, pnpm db:reset, ' +
      "pnpm test:db, pnpm db:types).",
  );
}
