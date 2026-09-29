"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AUDIT_SCOPES, auditHref, type AuditFilters as Filters } from "../query";

const ANY = "__any";

export function AuditFilters({
  filters,
  actors,
}: {
  filters: Filters;
  actors: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [actor, setActor] = useState(filters.actor ?? ANY);
  const [scope, setScope] = useState(filters.scope ?? ANY);
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");

  const actorItems = [{ value: ANY, label: "Anyone" }, ...actors];
  const scopeItems = [{ value: ANY, label: "Any scope" }, ...AUDIT_SCOPES];

  function apply(event: React.FormEvent) {
    event.preventDefault();
    router.push(
      auditHref({
        page: 1,
        actor: actor === ANY ? undefined : actor,
        scope: scope === ANY ? undefined : scope,
        from: from || undefined,
        to: to || undefined,
      }),
    );
  }

  const hasFilters = Boolean(filters.actor || filters.scope || filters.from || filters.to);

  return (
    <form
      onSubmit={apply}
      className="grid gap-4 rounded-lg border bg-muted p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end"
      aria-label="Filter audit log"
    >
      <div className="space-y-2">
        <Label htmlFor="audit-actor">Actor</Label>
        <Select
          items={actorItems}
          value={actor}
          onValueChange={(value) => setActor(String(value ?? ANY))}
        >
          <SelectTrigger
            id="audit-actor"
            className="h-10 w-full bg-background data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actorItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="audit-scope">Scope</Label>
        <Select
          items={scopeItems}
          value={scope}
          onValueChange={(value) => setScope(String(value ?? ANY))}
        >
          <SelectTrigger
            id="audit-scope"
            className="h-10 w-full bg-background data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scopeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="audit-from">From</Label>
        <Input
          id="audit-from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className="h-10 bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audit-to">To</Label>
        <Input
          id="audit-to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="h-10 bg-background"
        />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" className="h-10 flex-1 px-4 lg:flex-none">
          Apply
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={() => router.push("/admin/audit")}
          >
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
