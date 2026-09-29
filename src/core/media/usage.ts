// Human labels for media_references (entity_table + field). Add an entry whenever a new table
// starts recording references (see CLAUDE.md, "Media").

const LABELS: Record<string, { entity: string; fields: Record<string, string>; href?: string }> = {
  site_settings: {
    entity: "Site settings",
    href: "/admin/settings",
    fields: {
      logo_media_id: "Logo",
      logo_on_dark_media_id: "Logo on dark backgrounds",
      favicon_media_id: "Favicon",
      og_image_media_id: "Default share image",
    },
  },
  pages: {
    entity: "Page",
    href: "/admin/content",
    fields: {
      og_image_media_id: "Share image",
      published_sections: "Published version",
    },
  },
  page_sections: {
    entity: "Page",
    href: "/admin/content",
    fields: { props: "Section (draft)" },
  },
};

export type MediaUsage = { label: string; href: string | null };

export function describeUsage(reference: { entity_table: string; field: string }): MediaUsage {
  const entry = LABELS[reference.entity_table];
  if (!entry) return { label: `${reference.entity_table} · ${reference.field}`, href: null };
  return {
    label: `${entry.entity} · ${entry.fields[reference.field] ?? reference.field}`,
    href: entry.href ?? null,
  };
}
