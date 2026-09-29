import type { z } from "zod";

import type { IconKey } from "@/core/icons/registry";

import type { SectionBackground } from "./common";
import type { FieldDef } from "./fields";

/**
 * A section type (client-safe). The renderer lives separately in src/components/sections
 * (server components) and is looked up by key.
 */
export type SectionDefinition<S extends z.ZodType = z.ZodType> = {
  key: string;
  label: string;
  description: string;
  icon: IconKey;
  schema: S;
  /** Metadata for the generated editor form, in display order. */
  fields: FieldDef[];
  /** Default props: the North / Co content from docs/design. */
  defaults: z.input<S>;
  backgrounds: readonly SectionBackground[];
  defaultBackground: SectionBackground;
  /** Shown in the "Add section" dialog when the section depends on something else. */
  requirement?: { kind: "feed-provider"; message: string };
  /**
   * Available only while this module is on: hidden in "Add section", skipped on the public site,
   * and flagged in the editor. Set by the module registry for sections a module contributes.
   */
  requiresModule?: string;
  /** Available only while a module that provides a feed is on (the Module feed section). */
  requiresFeedModule?: boolean;
};

/** A stored section (draft row or published snapshot entry). */
export type SectionRecord = {
  id: string;
  type: string;
  props: unknown;
  background: string;
  padding: string;
  anchor_id: string | null;
};

export function defineSection<S extends z.ZodType>(
  definition: SectionDefinition<S>,
): SectionDefinition<S> {
  return definition;
}
