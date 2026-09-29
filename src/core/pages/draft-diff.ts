import type { SectionRecord } from "@/core/sections/types";

type DraftLike = {
  id: string;
  type: string;
  props: unknown;
  background: string;
  padding: string;
  anchor_id?: string | null;
  anchorId?: string | null;
  is_hidden?: boolean;
  isHidden?: boolean;
};

/** The draft as publish_page would publish it (non-hidden, in order). */
export function draftSnapshot(sections: DraftLike[]): SectionRecord[] {
  return sections
    .filter((s) => !(s.is_hidden ?? s.isHidden))
    .map((s) => ({
      id: s.id,
      type: s.type,
      props: s.props,
      background: s.background,
      padding: s.padding,
      anchor_id: s.anchor_id ?? s.anchorId ?? null,
    }));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** How many sections would change on publish: added, removed, edited, or moved. */
export function countSectionChanges(draft: SectionRecord[], published: SectionRecord[]): number {
  const before = new Map(published.map((s, index) => [s.id, { s, index }]));
  const after = new Set(draft.map((s) => s.id));
  let changes = 0;
  draft.forEach((section, index) => {
    const previous = before.get(section.id);
    if (
      !previous ||
      previous.index !== index ||
      stable({ ...section }) !== stable({ ...previous.s })
    )
      changes++;
  });
  for (const id of before.keys()) if (!after.has(id)) changes++;
  return changes;
}

export function hasUnpublishedChanges(draft: SectionRecord[], published: SectionRecord[]): boolean {
  return countSectionChanges(draft, published) > 0;
}
