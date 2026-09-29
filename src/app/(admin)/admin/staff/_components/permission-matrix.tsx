"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Permission } from "@/core/access/decide";
import { ACTION_LABELS, ACTIONS, SCOPES, type PermissionAction } from "@/core/access/scopes";

import { saveStaffPermissions } from "../actions";

const key = (scope: string, action: string) => `${scope}:${action}`;

function toSet(permissions: readonly Permission[]) {
  return new Set(permissions.map((p) => key(p.scope, p.action)));
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  return a.size === b.size && [...a].every((item) => b.has(item));
}

export function PermissionMatrix({
  userId,
  initial,
  modules,
}: {
  userId: string;
  initial: Permission[];
  modules: Record<string, boolean>;
}) {
  const [saved, setSaved] = useState(() => toSet(initial));
  const [selected, setSelected] = useState(() => toSet(initial));
  const [pending, startTransition] = useTransition();
  const dirty = useMemo(() => !sameSet(saved, selected), [saved, selected]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function toggle(scope: string, action: PermissionAction, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key(scope, action));
      else next.delete(key(scope, action));
      return next;
    });
  }

  function toggleRow(scope: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const action of ACTIONS) {
        if (checked) next.add(key(scope, action));
        else next.delete(key(scope, action));
      }
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const permissions = [...selected].map((item) => {
        const [scope, action] = item.split(":") as [string, PermissionAction];
        return { scope, action };
      });
      const result = await saveStaffPermissions({ userId, permissions });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(new Set(selected));
      toast.success("Permissions saved.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44">Area</TableHead>
              <TableHead className="text-center">All</TableHead>
              {ACTIONS.map((action) => (
                <TableHead key={action} className="text-center">
                  {ACTION_LABELS[action]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {SCOPES.map((scope) => {
              const count = ACTIONS.filter((action) => selected.has(key(scope.key, action))).length;
              const enabled = scope.kind === "core" || modules[scope.key] === true;
              return (
                <TableRow key={scope.key} data-testid={`permission-row-${scope.key}`}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{scope.label}</span>
                      {scope.kind === "module" && (
                        <Badge
                          variant="outline"
                          className={enabled ? "text-success" : "text-muted-foreground"}
                        >
                          {enabled ? "Module on" : "Module off"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      aria-label={`${scope.label}: all actions`}
                      checked={count === ACTIONS.length}
                      indeterminate={count > 0 && count < ACTIONS.length}
                      onCheckedChange={(checked) => toggleRow(scope.key, checked === true)}
                      className="mx-auto border-muted-foreground/60 data-indeterminate:border-primary"
                    />
                  </TableCell>
                  {ACTIONS.map((action) => (
                    <TableCell key={action} className="text-center">
                      <Checkbox
                        aria-label={`${scope.label}: ${ACTION_LABELS[action]}`}
                        checked={selected.has(key(scope.key, action))}
                        onCheckedChange={(checked) => toggle(scope.key, action, checked === true)}
                        className="mx-auto border-muted-foreground/60"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && (
          <span className="mr-auto text-sm text-accent" role="status">
            Unsaved changes
          </span>
        )}
        <Button
          variant="outline"
          disabled={!dirty || pending}
          onClick={() => setSelected(new Set(saved))}
        >
          Discard
        </Button>
        <Button disabled={!dirty || pending} onClick={save}>
          Save permissions
        </Button>
      </div>
    </div>
  );
}
