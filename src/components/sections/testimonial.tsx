import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import type { testimonialSection } from "@/core/sections/definitions/testimonial";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import { SectionEyebrow, SectionHeading, SectionImage } from "./primitives";
import { mutedText, type SectionTone } from "./section-shell";

type Props = z.output<typeof testimonialSection.schema>;

export function TestimonialSection({
  props,
  ctx,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  return (
    <SiteContainer className="grid items-center gap-12 lg:grid-cols-[547px_minmax(0,1fr)] lg:gap-20">
      <SectionImage
        value={props.image}
        ctx={ctx}
        sizes="(min-width: 1024px) 547px, 100vw"
        className="aspect-[547/450] w-full lg:aspect-[547/450]"
      />
      <figure className="space-y-6">
        <SectionEyebrow tone={tone}>{props.eyebrow}</SectionEyebrow>
        <SectionHeading as={ctx.headingTag} className="max-w-[380px]">
          {props.heading}
        </SectionHeading>
        <svg aria-hidden viewBox="0 0 34 30" className="mt-2 h-[30px] w-[34px] text-accent">
          <path
            fill="currentColor"
            d="M1 0h13v13c0 8-4 14-12 17l-1.5-4.5C5 24 7.2 20.6 7.5 17H1zM20 0h13v13c0 8-4 14-12 17l-1.5-4.5c4.5-1.5 6.7-4.9 7-8.5H20z"
          />
        </svg>
        <blockquote className="text-[17px] leading-[1.85] lg:text-[18px]">
          &ldquo;{props.quote}&rdquo;
        </blockquote>
        {(props.authorName || props.authorTitle) && (
          <figcaption className="flex items-start gap-4 pt-2">
            <span aria-hidden className="mt-2.5 h-0.5 w-7 shrink-0 bg-accent" />
            <span>
              <span className="block text-[13px] font-bold">{props.authorName}</span>
              {props.authorTitle && (
                <span className={cn("mt-1 block text-[11px]", mutedText(tone))}>
                  {props.authorTitle}
                </span>
              )}
            </span>
          </figcaption>
        )}
      </figure>
    </SiteContainer>
  );
}
