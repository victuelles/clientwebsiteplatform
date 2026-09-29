import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import type { introImageSection } from "@/core/sections/definitions/intro-image";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import { SectionAction, SectionEyebrow, SectionHeading, SectionImage } from "./primitives";
import { mutedText, type SectionTone } from "./section-shell";

type Props = z.output<typeof introImageSection.schema>;

export function IntroImageSection({
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
      <div className="mx-auto flex max-w-[620px] flex-col items-center space-y-5 text-center">
        <SectionEyebrow tone={tone} color="muted" className="text-[13px] tracking-[0.18em]">
          {props.eyebrow}
        </SectionEyebrow>
        <SectionHeading as={ctx.headingTag} className="max-w-[600px]">
          {props.heading}
        </SectionHeading>
        {props.text && (
          <p className={cn("text-[15px] leading-relaxed", mutedText(tone))}>{props.text}</p>
        )}
        <SectionAction
          action={props.link}
          ctx={ctx}
          variant="text"
          arrow="right"
          className="pt-2"
        />
      </div>
      <SectionImage
        value={props.image}
        ctx={ctx}
        sizes="(min-width: 1240px) 1192px, 100vw"
        className="mt-10 aspect-[16/9] w-full sm:aspect-[1190/360]"
      />
    </SiteContainer>
  );
}
