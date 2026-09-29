import type { Metadata } from "next";

import { requireSuperAdmin } from "@/core/access/guard";

import { AdminPageHeader } from "../_shell/page-header";
import { ModuleCard } from "./_components/module-card";
import { loadModuleCards } from "./data";

export const metadata: Metadata = { title: "Modules" };

export default async function ModulesPage() {
  await requireSuperAdmin();
  const cards = await loadModuleCards();

  return (
    <>
      <AdminPageHeader
        title="Modules"
        breadcrumbs={[{ label: "Modules" }]}
        description="Turn optional modules on or off for this site. Turning a module off hides it everywhere but never deletes its data."
      />
      <ul className="grid gap-4 lg:grid-cols-2" aria-label="Modules">
        {cards.map((card) => (
          <li key={card.key} className="flex">
            <ModuleCard card={card} />
          </li>
        ))}
      </ul>
    </>
  );
}
