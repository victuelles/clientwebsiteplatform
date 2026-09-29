"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ICONS, isIconKey, type IconKey } from "@/core/icons/registry";
import { SiteIcon } from "@/core/icons/icon";
import { cn } from "@/lib/utils";

/** Picks one of the curated icons (stores the key). */
export function IconField({
  id,
  value,
  onChange,
  optional,
  readOnly,
  label,
}: {
  id: string;
  value: string | null | undefined;
  onChange: (key: IconKey | null) => void;
  optional?: boolean;
  readOnly?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = isIconKey(value) ? value : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (Object.entries(ICONS) as [IconKey, (typeof ICONS)[IconKey]][]).filter(
      ([key, entry]) =>
        !q ||
        key.includes(q) ||
        entry.label.toLowerCase().includes(q) ||
        ("keywords" in entry && entry.keywords.includes(q)),
    );
  }, [query]);

  return (
    <div className="flex items-center gap-2">
      <Button
        id={id}
        type="button"
        variant="outline"
        className="h-9 justify-start gap-2"
        disabled={readOnly}
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${current ? ICONS[current].label : "none"}. Choose icon`}
      >
        <span className="flex size-5 items-center justify-center text-accent">
          {current ? <SiteIcon name={current} className="size-5" /> : "—"}
        </span>
        {current ? ICONS[current].label : "Choose icon"}
      </Button>
      {optional && current && !readOnly && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Remove
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Choose an icon</DialogTitle>
            <DialogDescription>
              Search by name or meaning, e.g. “growth”, “security”, “contact”.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons"
              aria-label="Search icons"
              className="h-10 pl-9"
              autoFocus
            />
          </div>
          <ul
            className="grid flex-1 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6"
            aria-label="Icons"
          >
            {results.map(([key, entry]) => (
              <li key={key}>
                <button
                  type="button"
                  aria-label={entry.label}
                  aria-pressed={current === key}
                  title={entry.label}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border p-2 text-accent hover:border-accent hover:bg-accent/5",
                    current === key && "border-accent bg-accent/10",
                  )}
                >
                  <SiteIcon name={key} className="size-6" />
                  <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                    {entry.label}
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No icons match.
              </li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
