import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import type { ctaBannerSection } from "@/core/sections/definitions/cta-banner";

import type { SectionRenderContext } from "./context";
import { SectionAction, SectionEyebrow } from "./primitives";
import type { SectionTone } from "./section-shell";

type Props = z.output<typeof ctaBannerSection.schema>;

export function CtaBannerSection({
  props,
  ctx,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  const Heading = ctx.headingTag;
  return (
    <SiteContainer className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        <SectionEyebrow tone={tone} className="text-[10px]">
          {props.eyebrow}
        </SectionEyebrow>
        {props.heading && (
          <Heading className="font-heading text-[24px] leading-snug font-normal tracking-tight lg:text-[30px]">
            {props.heading}
          </Heading>
        )}
      </div>
      {/* On the accent background the button is inverted for contrast. */}
      <SectionAction
        action={props.button}
        ctx={ctx}
        variant={tone === "accent" ? "light" : "accent"}
        arrow="up-right"
        className="h-12 self-start px-6 lg:self-auto"
      />
    </SiteContainer>
  );
}
