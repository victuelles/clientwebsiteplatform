"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AuditRow = {
  id: number;
  createdAt: string;
  actorName: string;
  action: string;
  scope: string | null;
  targetTable: string | null;
  targetId: string | null;
  targetLabel: string | null;
  metadata: unknown;
};

function formatTime(value: string) {
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

function target(row: AuditRow) {
  if (row.targetLabel) return row.targetLabel;
  if (row.targetTable && row.targetId) return `${row.targetTable} · ${row.targetId}`;
  return row.targetId ?? "—";
}

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [selected, setSelected] = useState<AuditRow | null>(null);

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatTime(row.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{row.actorName}</TableCell>
                <TableCell>
                  <code className="text-xs">{row.action}</code>
                </TableCell>
                <TableCell>
                  {row.scope ? <Badge variant="outline">{row.scope}</Badge> : "—"}
                </TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">
                  {target(row)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  <code>{selected.action}</code>
                </SheetTitle>
                <SheetDescription>{formatTime(selected.createdAt)}</SheetDescription>
              </SheetHeader>
              <dl className="grid gap-4 px-4 text-sm">
                {[
                  ["Actor", selected.actorName],
                  ["Scope", selected.scope ?? "—"],
                  ["Target", target(selected)],
                  ["Target table", selected.targetTable ?? "—"],
                  ["Target ID", selected.targetId ?? "—"],
                  ["Entry", `#${selected.id}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium break-all">{value}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-muted-foreground">Metadata</dt>
                  <dd>
                    <pre
                      className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed"
                      data-testid="audit-metadata"
                    >
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </dd>
                </div>
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
