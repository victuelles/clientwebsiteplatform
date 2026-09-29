import { richTextSection } from "./definitions/rich-text";
import type { SectionDefinition } from "./types";

// Every section type, in the order shown in the "Add section" dialog. To add a type, follow the
// checklist in CLAUDE.md ("How to add a section type").
export const SECTION_DEFINITIONS: SectionDefinition[] = [richTextSection] as SectionDefinition[];

const BY_KEY = new Map(SECTION_DEFINITIONS.map((definition) => [definition.key, definition]));

export function getSectionDefinition(key: string): SectionDefinition | undefined {
  return BY_KEY.get(key);
}

/** Default props for a new section of this type (parsed through its schema). */
export function defaultPropsFor(key: string): Record<string, unknown> {
  const definition = BY_KEY.get(key);
  if (!definition) throw new Error(`Unknown section type "${key}".`);
  return definition.schema.parse(definition.defaults) as Record<string, unknown>;
}
