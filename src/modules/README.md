# src/modules

One folder per optional module, added in later phases: blog, photo gallery, video gallery, shop,
business directory, inventory, CRM, booking, email marketing.

Each module owns its own:

- **routes**: page and layout components that the app router re-exports or mounts
- **components**: UI used only by that module
- **server actions**: mutations, each going through the shared access guard (Phase 2)
- **registry entry**: a manifest that describes the module (key, name, admin nav items, public
  routes, homepage sections it provides, required integrations)

## The boundary rule

Core code (`src/core`, `src/app` shells, `src/components/shared`) must **never import a module
directly**. It discovers and uses modules only through the module registry (Phase 5). This keeps
modules removable and lets a disabled module hide its UI without leaving broken imports behind.

Modules may import from core, `src/components`, and `src/lib`. Modules should not import from each
other; shared needs move into core.
