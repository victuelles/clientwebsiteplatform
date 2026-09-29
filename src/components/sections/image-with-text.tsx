import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import { SiteIcon } from "@/core/icons/icon";
import type { imageWithTextSection } from "@/core/sections/definitions/image-with-text";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import {
  RichTextContent,
  SectionAction,
  SectionEyebrow,
  SectionHeading,
  SectionImage,
} from "./primitives";
import { mutedText, type SectionTone } from "./section-shell";

type Props = z.output<typeof imageWithTextSection.schema>;

export function ImageWithTextSection({
  props,
  ctx,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  const right = props.imagePosition === "right";
  return (
    <SiteContainer
      className={cn(
        "grid items-center gap-14 lg:gap-[95px]",
        right ? "lg:grid-cols-[minmax(0,1fr)_548px]" : "lg:grid-cols-[548px_minmax(0,1fr)]",
      )}
    >
      {/* On mobile the image always comes first. */}
      <div className={cn("relative pr-[20px] pb-[35px] lg:pr-[43px]", right && "lg:order-last")}>
        {props.showFrame && (
          <div
            aria-hidden
            className="absolute top-[52px] right-0 bottom-0 left-[60px] border-[6px] border-border lg:top-[82px] lg:left-[100px]"
          />
        )}
        <SectionImage
          value={props.image}
          ctx={ctx}
          sizes="(min-width: 1024px) 505px, 100vw"
          className="relative z-10 aspect-[505/475] w-full"
        />
        {props.statValue && (
          <div className="absolute right-0 bottom-[45px] z-20 flex items-center gap-4 bg-background px-6 py-7 text-foreground shadow-[0_10px_30px_rgb(0_0_0/0.08)] lg:right-[-33px] lg:bottom-[55px] lg:min-w-[230px]">
            <span className="font-heading text-[40px] leading-none font-bold text-accent lg:text-[44px]">
              {props.statValue}
            </span>
            {props.statLabel && (
              <span className="max-w-[90px] text-[10px] leading-snug font-bold tracking-[0.12em] uppercase">
                {props.statLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="space-y-6">
        <SectionEyebrow tone={tone}>{props.eyebrow}</SectionEyebrow>
        <SectionHeading as={ctx.headingTag} className="max-w-[420px]">
          {props.heading}
        </SectionHeading>
        <RichTextContent doc={props.body} tone={tone} className="max-w-[500px] text-[15px]" />
        {props.features.length > 0 && (
          <ul className="grid gap-6 pt-2 sm:grid-cols-2">
            {props.features.map((feature, index) => (
              <li key={index} className="flex gap-4">
                <SiteIcon name={feature.icon} className="mt-0.5 size-[22px] shrink-0 text-accent" />
                <div>
                  <p className="text-[15px] font-bold">{feature.title}</p>
                  {feature.text && (
                    <p className={cn("mt-1.5 text-[13px] leading-relaxed", mutedText(tone))}>
                      {feature.text}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-4">
          <SectionAction
            action={props.button}
            ctx={ctx}
            variant={tone === "dark" ? "accent" : "dark"}
            arrow="up-right"
            className="h-12 px-6"
          />
        </div>
      </div>
    </SiteContainer>
  );
}
