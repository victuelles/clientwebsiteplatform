import "server-only";

import type { SectionRenderContext } from "./context";
import { RichTextSection } from "./rich-text";
import type { SectionTone } from "./section-shell";

export type SectionRenderer = (args: {
  props: never;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) => React.ReactNode | Promise<React.ReactNode>;

// Server renderer for each section key (definitions live in src/core/sections).
export const SECTION_RENDERERS: Record<string, SectionRenderer> = {
  rich_text: RichTextSection as SectionRenderer,
};
