// Field metadata that drives the generated section forms in the page editor.

export type FieldBase = {
  name: string;
  label: string;
  help?: string;
  placeholder?: string;
};

export type FieldDef =
  | (FieldBase & { type: "text"; maxLength?: number })
  | (FieldBase & { type: "textarea"; rows?: number; maxLength?: number })
  | (FieldBase & { type: "richtext" })
  | (FieldBase & { type: "media"; accept?: "image" | "any" })
  | (FieldBase & { type: "link"; optional?: boolean })
  /** A button or text link: { label, link }. */
  | (FieldBase & { type: "action" })
  | (FieldBase & { type: "icon"; optional?: boolean })
  | (FieldBase & {
      type: "select";
      options: { value: string; label: string }[];
      /** Options supplied by the editor at runtime instead (e.g. feed providers). */
      dynamicOptions?: "feed-sources";
    })
  | (FieldBase & { type: "toggle" })
  | (FieldBase & { type: "number"; min?: number; max?: number; step?: number })
  | (FieldBase & {
      type: "list";
      /** Singular name for one item, e.g. "Card". */
      itemLabel: string;
      /** Field used as each item's title in the collapsed list. */
      itemTitleField?: string;
      fields: FieldDef[];
      /** Props for a newly added item. */
      newItem: Record<string, unknown>;
      min?: number;
      max?: number;
    });

export type FieldType = FieldDef["type"];
