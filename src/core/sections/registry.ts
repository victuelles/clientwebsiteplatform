import { cardGridSection } from "./definitions/card-grid";
import { contactFormSection } from "./definitions/contact-form";
import { ctaBannerSection } from "./definitions/cta-banner";
import { heroSection } from "./definitions/hero";
import { imageWithTextSection } from "./definitions/image-with-text";
import { introImageSection } from "./definitions/intro-image";
import { moduleFeedSection } from "./definitions/module-feed";
import { richTextSection } from "./definitions/rich-text";
import { statsSection } from "./definitions/stats";
import { testimonialSection } from "./definitions/testimonial";
import { valueStripSection } from "./definitions/value-strip";
import { moduleSectionDefinitions } from "@/core/modules/registry";

import type { SectionBackground, SectionPadding } from "./common";
import type { SectionDefinition } from "./types";

// Every section type, in the order shown in the "Add section" dialog: the core types, then the
// types modules contribute through their manifests. To add a type, follow the checklist in
// CLAUDE.md ("Adding a section type").
const CORE_SECTION_DEFINITIONS: SectionDefinition[] = [
  heroSection,
  imageWithTextSection,
  valueStripSection,
  cardGridSection,
  statsSection,
  testimonialSection,
  ctaBannerSection,
  introImageSection,
  moduleFeedSection,
  richTextSection,
  contactFormSection,
] as SectionDefinition[];

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  ...CORE_SECTION_DEFINITIONS,
  ...moduleSectionDefinitions(),
];

const BY_KEY = new Map(SECTION_DEFINITIONS.map((definition) => [definition.key, definition]));
if (BY_KEY.size !== SECTION_DEFINITIONS.length) {
  throw new Error("Two section types share a key (check the modules' sectionTypes).");
}

export function getSectionDefinition(key: string): SectionDefinition | undefined {
  return BY_KEY.get(key);
}

/** Default props for a new section of this type (parsed through its schema). */
export function defaultPropsFor(key: string): Record<string, unknown> {
  const definition = BY_KEY.get(key);
  if (!definition) throw new Error(`Unknown section type "${key}".`);
  return definition.schema.parse(definition.defaults) as Record<string, unknown>;
}

/** Sections that manage their own spacing or are bands start with different padding. */
export const DEFAULT_PADDING: Record<string, SectionPadding> = {
  hero: "none",
  value_strip: "compact",
  cta_banner: "compact",
};

export function defaultSettingsFor(key: string): {
  background: SectionBackground;
  padding: SectionPadding;
} {
  const definition = BY_KEY.get(key);
  return {
    background: definition?.defaultBackground ?? "white",
    padding: DEFAULT_PADDING[key] ?? "normal",
  };
}
