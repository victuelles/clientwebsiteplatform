import { Mail, MapPin, Phone } from "lucide-react";
import type { z } from "zod";

import { SiteContainer } from "@/components/site/container";
import type { contactFormSection } from "@/core/sections/definitions/contact-form";

import { ContactFormFields } from "./contact-form-fields";
import type { SectionRenderContext } from "./context";
import { SectionEyebrow, SectionHeading } from "./primitives";
import type { SectionTone } from "./section-shell";

type Props = z.output<typeof contactFormSection.schema>;

export function ContactFormSection({
  props,
  ctx,
  tone,
}: {
  props: Props;
  ctx: SectionRenderContext;
  tone: SectionTone;
}) {
  const { contactEmail, phone, locationLabel } = ctx.site;
  const details = props.showDetails && (contactEmail || phone || locationLabel);
  return (
    <SiteContainer
      className={
        details ? "grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-3" : undefined
      }
    >
      <div className="border border-border bg-background p-7 text-foreground lg:p-[30px]">
        <div className="space-y-4">
          <SectionEyebrow tone={tone === "accent" ? "light" : tone}>{props.eyebrow}</SectionEyebrow>
          <SectionHeading as={ctx.headingTag} className="text-[28px] lg:text-[34px]">
            {props.heading}
          </SectionHeading>
          {props.text && <p className="text-[15px] text-muted-foreground">{props.text}</p>}
        </div>
        <div className="mt-7">
          <ContactFormFields
            pageId={ctx.pageId}
            sectionId={`contact-${ctx.index}`}
            showPhone={props.showPhone}
            showCompany={props.showCompany}
            submitLabel={props.submitLabel || "Send message"}
            successMessage={props.successMessage || "Thanks! We'll be in touch soon."}
          />
        </div>
      </div>
      {details && (
        <aside
          className="bg-navy p-7 text-navy-foreground lg:p-[30px]"
          aria-label="Contact details"
        >
          <div className="space-y-4">
            <SectionEyebrow tone="dark">{props.detailsEyebrow}</SectionEyebrow>
            {props.detailsHeading && (
              <p className="font-heading text-[28px] leading-tight lg:text-[32px]">
                {props.detailsHeading}
              </p>
            )}
            {props.detailsText && (
              <p className="text-[14px] leading-[1.8] text-navy-foreground/75">
                {props.detailsText}
              </p>
            )}
          </div>
          <ul className="mt-7 divide-y divide-navy-foreground/15 border-t border-navy-foreground/15 text-[14px]">
            {contactEmail && (
              <li className="py-4">
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3 text-accent hover:underline"
                >
                  <Mail aria-hidden className="size-5 shrink-0" /> {contactEmail}
                </a>
              </li>
            )}
            {phone && (
              <li className="py-4">
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-3 hover:text-accent"
                >
                  <Phone aria-hidden className="size-5 shrink-0 text-accent" /> {phone}
                </a>
              </li>
            )}
            {locationLabel && (
              <li className="flex items-center gap-3 py-4">
                <MapPin aria-hidden className="size-5 shrink-0 text-accent" /> {locationLabel}
              </li>
            )}
          </ul>
        </aside>
      )}
    </SiteContainer>
  );
}
