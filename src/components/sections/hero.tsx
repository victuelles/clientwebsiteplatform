import { ArrowDown } from "lucide-react";
import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import type { heroSection } from "@/core/sections/definitions/hero";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import { SectionAction, SectionEyebrow, SectionImage } from "./primitives";
import type { SectionTone } from "./section-shell";

type Props = z.output<typeof heroSection.schema>;

export function HeroSection({
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
    <div className="relative isolate flex min-h-[560px] items-center overflow-hidden lg:min-h-[630px]">
      <SectionImage
        value={props.image}
        ctx={ctx}
        sizes="100vw"
        priority={ctx.index === 0}
        alt=""
        quietPlaceholder
        className="absolute inset-0 -z-20 lg:left-[28%]"
        imgClassName="object-cover object-center"
      />
      {/* Soft white fade on the text side. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/95 via-background/80 to-background/60 lg:bg-gradient-to-r lg:from-background lg:from-[28%] lg:via-background/80 lg:via-[46%] lg:to-background/0 lg:to-[78%]"
      />
      <SiteContainer className="py-16 lg:py-20">
        <div className="max-w-[600px]">
          <SectionEyebrow
            tone={tone}
            color="muted"
            className="text-[13px] tracking-[0.18em] lg:text-[15px]"
          >
            {props.eyebrow}
          </SectionEyebrow>
          <Heading className="mt-8 font-heading text-[44px] leading-[1.04] font-bold tracking-tight text-foreground lg:text-[58px]">
            <span className="whitespace-pre-line">{props.headline}</span>
            {props.accentLine && <span className="block text-accent">{props.accentLine}</span>}
          </Heading>
          {props.text && (
            <p className="mt-7 max-w-[470px] text-[15px] leading-[1.85] text-muted-foreground">
              {props.text}
            </p>
          )}
          <div className="mt-10 flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:gap-8">
            <SectionAction
              action={props.primary}
              ctx={ctx}
              variant="accent"
              arrow="up-right"
              className="h-12 px-6"
            />
            <SectionAction action={props.secondary} ctx={ctx} variant="text" arrow="right" />
          </div>
        </div>
      </SiteContainer>
      {props.sideText && (
        <p
          aria-hidden
          className={cn(
            "absolute top-1/2 right-7 hidden -translate-y-1/2 text-[10px] font-bold tracking-[0.32em] uppercase [writing-mode:vertical-rl] lg:block",
            props.image ? "text-white" : "text-muted-foreground",
          )}
        >
          {props.sideText}
        </p>
      )}
      {props.showScrollIndicator && (
        <span
          aria-hidden
          className="absolute bottom-0 left-1/2 flex size-[46px] -translate-x-1/2 items-center justify-center bg-background text-accent"
        >
          <ArrowDown className="size-4" strokeWidth={1.75} />
        </span>
      )}
    </div>
  );
}
