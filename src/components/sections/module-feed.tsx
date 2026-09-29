import "server-only";

import { ChevronRight, Rss } from "lucide-react";
import Link from "next/link";
import type { z } from "zod";

import { MediaImage } from "@/components/media/media-image";
import { SiteContainer } from "@/components/site/container";
import type { moduleFeedSection } from "@/core/sections/definitions/module-feed";
import { getFeedProvider } from "@/core/sections/feeds";

import type { SectionRenderContext } from "./context";
import { SectionAction, SectionEyebrow, SectionHeading } from "./primitives";
import type { SectionTone } from "./section-shell";

type Props = z.output<typeof moduleFeedSection.schema>;

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export async function ModuleFeedSection({
  props,
  ctx,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  const provider = getFeedProvider(props.source);
  const enabled = provider ? ctx.links.modules[provider.moduleKey] === true : false;
  const items = provider && enabled ? await provider.getItems(Number(props.count)) : [];

  if (items.length === 0) {
    // Public site: nothing. Editor preview: explain why the section is empty.
    if (!ctx.preview) return null;
    const reason = !provider
      ? `No module provides “${props.source}” yet. This section appears once that module is installed.`
      : !enabled
        ? `The ${provider.label} module is turned off, so visitors don't see this section.`
        : `${provider.label} has no items yet, so visitors don't see this section.`;
    return (
      <SiteContainer>
        <div className="flex flex-col items-center gap-3 border border-dashed border-current/25 px-6 py-12 text-center">
          <Rss aria-hidden className="size-6 text-accent" />
          <p className="font-medium">{props.heading || "Module feed"}</p>
          <p className="max-w-md text-sm opacity-70">{reason}</p>
        </div>
      </SiteContainer>
    );
  }

  return (
    <SiteContainer>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <SectionEyebrow tone={tone}>{props.eyebrow}</SectionEyebrow>
          <SectionHeading as={ctx.headingTag}>{props.heading}</SectionHeading>
        </div>
        <SectionAction
          action={props.viewAll}
          ctx={ctx}
          variant="text"
          arrow="right"
          className="pb-2"
        />
      </div>
      <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="border border-border bg-background">
            <Link href={item.href} className="group block">
              <div className="relative aspect-[380/215] overflow-hidden bg-muted">
                {item.image && (
                  <MediaImage
                    asset={item.image}
                    fill
                    sizes="(min-width: 1024px) 380px, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <div className="space-y-4 p-6">
                <p className="flex items-center gap-3 text-[10px]">
                  {item.category && (
                    <span className="font-bold tracking-[0.14em] text-accent uppercase">
                      {item.category}
                    </span>
                  )}
                  {item.date && (
                    <time dateTime={item.date} className="text-muted-foreground">
                      {formatDate(item.date)}
                    </time>
                  )}
                </p>
                <h3 className="font-heading text-[18px] leading-snug font-normal text-foreground group-hover:text-accent">
                  {item.title}
                </h3>
                <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-foreground uppercase">
                  Read article <ChevronRight aria-hidden className="size-3.5 text-accent" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SiteContainer>
  );
}
