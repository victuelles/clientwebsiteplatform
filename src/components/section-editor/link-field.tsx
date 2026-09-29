"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCOPES } from "@/core/access/scopes";
import { LINK_KIND_LABELS, type Link, type LinkKind } from "@/core/links/types";

import { useSectionEditor } from "./editor-context";

const NONE = "__none";
const THIS_PAGE = "__this";

const MODULE_PATHS: Record<string, string> = {
  blog: "/blog",
  photo_gallery: "/gallery",
  video_gallery: "/videos",
  shop: "/shop",
  directory: "/directory",
  booking: "/booking",
};

function emptyLink(kind: LinkKind, firstPageId?: string): Link | null {
  switch (kind) {
    case "page":
      return firstPageId ? { kind, pageId: firstPageId } : null;
    case "url":
      return { kind, href: "https://" };
    case "anchor":
      return { kind, anchorId: "section" };
    case "email":
      return { kind, address: "" };
    case "phone":
      return { kind, number: "" };
    case "module":
      return { kind, moduleKey: "blog", path: "/blog" };
  }
}

/** Edits a Link value (page, URL, section anchor, email, phone, or module page). */
export function LinkField({
  id,
  value,
  onChange,
  optional = true,
  invalid,
}: {
  id: string;
  value: Link | null | undefined;
  onChange: (link: Link | null) => void;
  optional?: boolean;
  invalid?: boolean;
}) {
  const { pages, modules, readOnly } = useSectionEditor();
  const kind = value?.kind ?? NONE;

  const kindItems = [
    ...(optional ? [{ value: NONE, label: "No link" }] : []),
    ...Object.entries(LINK_KIND_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const pageItems = pages.map((p) => ({
    value: p.id,
    label: `${p.title} (${p.isHome ? "/" : `/${p.slug}`})${p.published ? "" : " · not published"}`,
  }));
  const moduleItems = SCOPES.filter((s) => s.kind === "module").map((s) => ({
    value: s.key,
    label: `${s.label}${modules[s.key] ? "" : " (turned off: link hidden)"}`,
  }));

  const select = (
    items: { value: string; label: string }[],
    current: string,
    set: (v: string) => void,
    label: string,
  ) => (
    <Select items={items} value={current} onValueChange={(v) => set(String(v))} disabled={readOnly}>
      <SelectTrigger
        aria-label={label}
        className="h-9 w-full data-[size=default]:h-9"
        aria-invalid={invalid}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-2" id={id}>
      {select(
        kindItems,
        kind,
        (v) => onChange(v === NONE ? null : emptyLink(v as LinkKind, pages[0]?.id)),
        "Link type",
      )}
      {value?.kind === "page" &&
        select(pageItems, value.pageId, (pageId) => onChange({ kind: "page", pageId }), "Page")}
      {value?.kind === "url" && (
        <Input
          aria-label="Web address"
          value={value.href}
          disabled={readOnly}
          onChange={(e) => onChange({ kind: "url", href: e.target.value })}
          placeholder="https://example.com or /pricing"
          className="h-9"
          aria-invalid={invalid}
        />
      )}
      {value?.kind === "anchor" && (
        <>
          {select(
            [{ value: THIS_PAGE, label: "This page" }, ...pageItems],
            value.pageId ?? THIS_PAGE,
            (pageId) =>
              onChange({
                kind: "anchor",
                anchorId: value.anchorId,
                ...(pageId === THIS_PAGE ? {} : { pageId }),
              }),
            "Page with the section",
          )}
          <Input
            aria-label="Section anchor ID"
            value={value.anchorId}
            disabled={readOnly}
            onChange={(e) => onChange({ ...value, anchorId: e.target.value })}
            placeholder="growth-strategy"
            className="h-9"
            aria-invalid={invalid}
          />
        </>
      )}
      {value?.kind === "email" && (
        <Input
          aria-label="Email address"
          type="email"
          value={value.address}
          disabled={readOnly}
          onChange={(e) => onChange({ kind: "email", address: e.target.value })}
          placeholder="hello@example.com"
          className="h-9"
          aria-invalid={invalid}
        />
      )}
      {value?.kind === "phone" && (
        <Input
          aria-label="Phone number"
          type="tel"
          value={value.number}
          disabled={readOnly}
          onChange={(e) => onChange({ kind: "phone", number: e.target.value })}
          placeholder="+1 (650) 410-7800"
          className="h-9"
          aria-invalid={invalid}
        />
      )}
      {value?.kind === "module" && (
        <>
          {select(
            moduleItems,
            value.moduleKey,
            (moduleKey) =>
              onChange({
                kind: "module",
                moduleKey,
                path: MODULE_PATHS[moduleKey] ?? `/${moduleKey}`,
              }),
            "Module",
          )}
          <Input
            aria-label="Module page path"
            value={value.path}
            disabled={readOnly}
            onChange={(e) => onChange({ ...value, path: e.target.value })}
            className="h-9"
            aria-invalid={invalid}
          />
        </>
      )}
    </div>
  );
}
