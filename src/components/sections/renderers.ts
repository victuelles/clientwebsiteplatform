import "server-only";

import { moduleSectionRenderers } from "@/core/modules/registry.server";

import { CardGridSection } from "./card-grid";
import { ContactFormSection } from "./contact-form";
import type { SectionRenderContext } from "./context";
import { CtaBannerSection } from "./cta-banner";
import { HeroSection } from "./hero";
import { ImageWithTextSection } from "./image-with-text";
import { IntroImageSection } from "./intro-image";
import { ModuleFeedSection } from "./module-feed";
import { RichTextSection } from "./rich-text";
import type { SectionTone } from "./section-shell";
import { StatsSection } from "./stats";
import { TestimonialSection } from "./testimonial";
import { ValueStripSection } from "./value-strip";

export type SectionRenderer = (args: {
  props: never;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) => React.ReactNode | Promise<React.ReactNode>;

// Server renderer for each section key (definitions live in src/core/sections).
export const SECTION_RENDERERS: Record<string, SectionRenderer> = {
  hero: HeroSection as SectionRenderer,
  image_with_text: ImageWithTextSection as SectionRenderer,
  value_strip: ValueStripSection as SectionRenderer,
  card_grid: CardGridSection as SectionRenderer,
  stats: StatsSection as SectionRenderer,
  testimonial: TestimonialSection as SectionRenderer,
  cta_banner: CtaBannerSection as SectionRenderer,
  intro_image: IntroImageSection as SectionRenderer,
  module_feed: ModuleFeedSection as SectionRenderer,
  rich_text: RichTextSection as SectionRenderer,
  contact_form: ContactFormSection as SectionRenderer,
  // Section types contributed by modules (module.server.ts sectionRenderers).
  ...(moduleSectionRenderers() as Record<string, SectionRenderer>),
};
