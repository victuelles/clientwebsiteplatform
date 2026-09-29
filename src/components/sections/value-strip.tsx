import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import { SiteIcon } from "@/core/icons/icon";
import type { valueStripSection } from "@/core/sections/definitions/value-strip";
import { cn } from "@/lib/utils";

import type { SectionRenderContext } from "./context";
import { mutedText, type SectionTone } from "./section-shell";

type Props = z.output<typeof valueStripSection.schema>;

const COLUMNS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function ValueStripSection({
  props,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  return (
    <SiteContainer>
      <ul className={cn("grid gap-7 lg:gap-0", COLUMNS[props.items.length])}>
        {props.items.map((item, index) => (
          <li
            key={index}
            className={cn(
              "flex gap-4 lg:px-7 lg:py-1 lg:first:pl-1.5",
              index > 0 &&
                (tone === "light"
                  ? "lg:border-l lg:border-border"
                  : "lg:border-l lg:border-current/15"),
            )}
          >
            <SiteIcon name={item.icon} className="mt-0.5 size-[22px] shrink-0 text-accent" />
            <div>
              <p className="text-[14px] font-medium">{item.title}</p>
              {item.text && <p className={cn("mt-2 text-[12px]", mutedText(tone))}>{item.text}</p>}
            </div>
          </li>
        ))}
      </ul>
    </SiteContainer>
  );
}
