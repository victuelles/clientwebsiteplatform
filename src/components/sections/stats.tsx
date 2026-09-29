import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import type { statsSection } from "@/core/sections/definitions/stats";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import { CountUp } from "./count-up";
import { SectionAction, SectionEyebrow, SectionHeading } from "./primitives";
import { mutedText, type SectionTone } from "./section-shell";

type Props = z.output<typeof statsSection.schema>;

export function StatsSection({
  props,
  ctx,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  const line = tone === "light" ? "border-border" : "border-current/15";
  return (
    <SiteContainer className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_555px] lg:gap-16">
      <div className="space-y-6">
        <SectionEyebrow tone={tone}>{props.eyebrow}</SectionEyebrow>
        <SectionHeading as={ctx.headingTag} className="max-w-[420px]">
          {props.heading}
        </SectionHeading>
        {props.text && (
          <p className={cn("max-w-[420px] text-[15px] leading-[1.75]", mutedText(tone))}>
            {props.text}
          </p>
        )}
        <div className="pt-3">
          <SectionAction
            action={props.link}
            ctx={ctx}
            variant={tone === "light" ? "text" : "text-light"}
            arrow="up-right"
            className="text-[13px] tracking-normal normal-case"
          />
        </div>
      </div>
      <dl className="grid grid-cols-2">
        {props.stats.map((stat, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col-reverse px-2.5 py-6 lg:px-[30px] lg:py-[30px]",
              index % 2 === 1 && `border-l ${line}`,
              index >= 2 && `border-t ${line}`,
            )}
          >
            <dt className={cn("mt-3 text-[13px] lg:mt-4", mutedText(tone))}>{stat.label}</dt>
            <dd className="font-heading text-[36px] leading-none font-bold lg:text-[44px]">
              <CountUp value={stat.value} />
            </dd>
          </div>
        ))}
      </dl>
    </SiteContainer>
  );
}
