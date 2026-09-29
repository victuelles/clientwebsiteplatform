import type { LinkContext } from "@/core/links/resolve";
import type { MediaAsset } from "@/core/media/types";
import type { SiteSettings } from "@/core/settings/get-settings";

export type SectionRenderContext = {
  pageId: string;
  /** Main heading level for this section (heading rule: first section h1, others h2). */
  headingTag: "h1" | "h2";
  index: number;
  media: Readonly<Record<string, MediaAsset>>;
  links: LinkContext;
  site: SiteSettings;
  /** True in /preview (editor): sections render explanatory placeholders instead of nothing. */
  preview: boolean;
};
