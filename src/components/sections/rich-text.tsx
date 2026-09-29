import type { z } from "zod";

import type { richTextSection } from "@/core/sections/definitions/rich-text";
import { SiteContainer } from "@/components/site/container";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import { RichTextContent, SectionEyebrow, SectionHeading } from "./primitives";
import type { SectionTone } from "./section-shell";

type Props = z.output<typeof richTextSection.schema>;

export function RichTextSection({
  props,
  ctx,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  return (
    <SiteContainer>
      <div className={cn("space-y-6", props.width === "narrow" ? "max-w-[720px]" : "max-w-none")}>
        <SectionEyebrow tone={tone}>{props.eyebrow}</SectionEyebrow>
        <SectionHeading as={ctx.headingTag}>{props.heading}</SectionHeading>
        <RichTextContent doc={props.body} tone={tone} className="text-base lg:text-[17px]" />
      </div>
    </SiteContainer>
  );
}
