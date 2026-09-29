import "server-only";

import { TriangleAlert } from "lucide-react";

import { SiteContainer } from "@/components/site/container";
import {
  headingTagFor,
  SECTION_BACKGROUNDS,
  SECTION_PADDINGS,
  type SectionBackground,
  type SectionPadding,
} from "@/core/sections/common";
import { getSectionDefinition } from "@/core/sections/registry";
import type { SectionRecord } from "@/core/sections/types";

import type { SectionRenderContext } from "./context";
import { SECTION_RENDERERS } from "./renderers";
import { SectionShell, toneFor } from "./section-shell";

type Shared = Omit<SectionRenderContext, "headingTag" | "index">;

function asBackground(value: string, fallback: SectionBackground): SectionBackground {
  return (SECTION_BACKGROUNDS as readonly string[]).includes(value)
    ? (value as SectionBackground)
    : fallback;
}
function asPadding(value: string): SectionPadding {
  return (SECTION_PADDINGS as readonly string[]).includes(value)
    ? (value as SectionPadding)
    : "normal";
}

function SectionError({
  id,
  title,
  detail,
  preview,
}: {
  id: string;
  title: string;
  detail: string;
  preview: boolean;
}) {
  return (
    <section data-section-id={preview ? id : undefined} className="bg-background py-10">
      <SiteContainer>
        <div
          role="alert"
          className="flex gap-3 border border-dashed border-destructive/50 bg-destructive/5 p-5 text-sm"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">{title}</p>
            <p className="mt-1 text-muted-foreground">{detail}</p>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}

/**
 * Renders a list of sections. Props are validated again here: on the public site an invalid
 * section is skipped (and logged) so the page never crashes; in the preview it shows an error.
 */
export async function RenderSections({
  sections,
  context,
}: {
  sections: SectionRecord[];
  context: Shared;
}) {
  const rendered = await Promise.all(
    sections.map(async (section, index) => {
      const definition = getSectionDefinition(section.type);
      const Renderer = SECTION_RENDERERS[section.type];
      if (!definition || !Renderer) {
        console.error(`Unknown section type "${section.type}" (${section.id}); skipped.`);
        return context.preview ? (
          <SectionError
            key={section.id}
            id={section.id}
            preview
            title={`Unknown section type “${section.type}”`}
            detail="This section can't be displayed. Delete it or restore an earlier version."
          />
        ) : null;
      }

      const parsed = definition.schema.safeParse(section.props);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const where = issue?.path.join(" › ") || "props";
        console.error(
          `Invalid props for ${section.type} section ${section.id}: ${where}: ${issue?.message}`,
        );
        return context.preview ? (
          <SectionError
            key={section.id}
            id={section.id}
            preview
            title={`${definition.label}: this section has invalid content`}
            detail={`Fix “${where}”: ${issue?.message ?? "invalid value"}. Visitors won't see this section until it's fixed.`}
          />
        ) : null;
      }

      const background = asBackground(section.background, definition.defaultBackground);
      const tone = toneFor(background);
      const ctx: SectionRenderContext = { ...context, index, headingTag: headingTagFor(index) };
      const content = await Renderer({ props: parsed.data as never, ctx, tone });
      if (content === null) return null;
      return (
        <SectionShell
          key={section.id}
          id={section.id}
          anchorId={section.anchor_id}
          background={background}
          padding={asPadding(section.padding)}
          preview={context.preview}
        >
          {content}
        </SectionShell>
      );
    }),
  );
  return <>{rendered}</>;
}
