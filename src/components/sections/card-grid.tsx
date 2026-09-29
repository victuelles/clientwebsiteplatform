import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import { SiteIcon } from "@/core/icons/icon";
import { linkAttributes, resolveLink } from "@/core/links/resolve";
import type { cardGridSection } from "@/core/sections/definitions/card-grid";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import { SectionEyebrow, SectionHeading } from "./primitives";
import { mutedText, type SectionTone } from "./section-shell";

type Props = z.output<typeof cardGridSection.schema>;

const COLUMNS = {
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-2 lg:grid-cols-3",
  "4": "md:grid-cols-2 lg:grid-cols-4",
} as const;

export function CardGridSection({
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
      <div className="mx-auto flex max-w-[640px] flex-col items-center space-y-5 text-center">
        <SectionEyebrow tone={tone}>{props.eyebrow}</SectionEyebrow>
        <SectionHeading as={ctx.headingTag} className="max-w-[560px]">
          {props.heading}
        </SectionHeading>
        {props.intro && (
          <p className={cn("text-[15px] leading-relaxed", mutedText(tone))}>{props.intro}</p>
        )}
      </div>
      <ul className={cn("mt-12 grid gap-4 lg:mt-[52px]", COLUMNS[props.columns])}>
        {props.cards.map((card, index) => {
          const resolved = resolveLink(card.link, ctx.links);
          const body = (
            <>
              <SiteIcon name={card.icon} className="size-[26px] text-accent" />
              {props.showNumbers && (
                <span
                  aria-hidden
                  className="absolute top-8 right-7 text-[11px] font-bold tracking-wider text-muted-foreground/40"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <h3 className="mt-7 font-heading text-[17px] font-normal text-foreground">
                {card.title}
              </h3>
              {card.text && (
                <p className="mt-3 max-w-[260px] text-[13px] leading-[1.65] text-muted-foreground">
                  {card.text}
                </p>
              )}
              {resolved && (
                <span
                  aria-hidden
                  className="absolute right-7 bottom-6 flex size-[30px] items-center justify-center rounded-full border border-border text-accent transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground"
                >
                  <ArrowUpRight className="size-3.5" strokeWidth={2} />
                </span>
              )}
            </>
          );
          const cardClass =
            "group relative flex h-full min-h-[234px] flex-col border border-border bg-background p-[30px] pb-16 transition-colors";
          return (
            <li key={index}>
              {resolved ? (
                <Link
                  {...linkAttributes(resolved)}
                  className={cn(
                    cardClass,
                    "hover:border-accent focus-visible:border-accent focus-visible:outline-none",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={cardClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </SiteContainer>
  );
}
