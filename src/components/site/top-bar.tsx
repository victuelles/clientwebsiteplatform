import { Mail, MapPin, Phone } from "lucide-react";

import type { SiteSettings } from "@/core/settings/get-settings";

import { AccountLinks } from "./account-link";
import { SiteContainer } from "./container";

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Phone and email on the left, location on the right. Mobile shows phone and email only. */
export function TopBar({ settings }: { settings: SiteSettings }) {
  const { phone, contactEmail, locationLabel } = settings;
  if (!settings.showTopBar || (!phone && !contactEmail && !locationLabel)) return null;

  return (
    <div className="bg-background text-[13px] text-muted-foreground" data-testid="top-bar">
      <SiteContainer className="flex h-[35px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5 sm:gap-6">
          {phone && (
            <a
              href={telHref(phone)}
              className="flex shrink-0 items-center gap-2 transition-colors hover:text-foreground"
            >
              <Phone aria-hidden className="size-3.5 text-accent" />
              {phone}
            </a>
          )}
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="flex min-w-0 items-center gap-2 transition-colors hover:text-foreground"
            >
              <Mail aria-hidden className="size-3.5 shrink-0 text-accent" />
              <span className="truncate">{contactEmail}</span>
            </a>
          )}
        </div>
        <div className="hidden items-center gap-6 md:flex">
          {locationLabel && (
            <span className="flex items-center gap-2">
              <MapPin aria-hidden className="size-3.5 text-accent" />
              {locationLabel}
            </span>
          )}
          <AccountLinks linkClassName="hover:text-foreground" />
        </div>
      </SiteContainer>
    </div>
  );
}
