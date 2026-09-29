import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { getMenus } from "@/core/navigation/menus";
import type { SiteSettings } from "@/core/settings/get-settings";
import { SOCIAL_PLATFORMS } from "@/core/settings/social";

import { AccountLinks } from "./account-link";
import { SiteContainer } from "./container";
import { Logo } from "./logo";
import { SocialIcon } from "./social-icon";

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
function platformLabel(key: string) {
  if (key === "email") return "Email us";
  if (key === "phone") return "Call us";
  return SOCIAL_PLATFORMS.find((p) => p.key === key)?.label ?? key;
}

/** Navy footer: brand column, link columns, contact column, and the legal row. */
export async function SiteFooter({ settings }: { settings: SiteSettings }) {
  const { footer } = await getMenus();
  const { phone, contactEmail, locationLabel } = settings;
  const hasContact = Boolean(phone || contactEmail || locationLabel);

  return (
    <footer className="bg-navy text-navy-foreground" data-testid="site-footer">
      <SiteContainer className="pt-[70px] pb-7">
        <div className="grid gap-12 lg:grid-cols-[1.74fr_1fr_1.14fr_1.12fr] lg:gap-0">
          <div className="space-y-6">
            <Link href="/" className="inline-block" aria-label={`${settings.siteName} home`}>
              <Logo
                siteName={settings.siteName}
                asset={settings.logoOnDark ?? settings.logo}
                tone="dark"
              />
            </Link>
            {settings.description && (
              <p className="max-w-[280px] text-[13px] leading-[1.7] text-navy-foreground/65">
                {settings.description}
              </p>
            )}
            {settings.socialLinks.length > 0 && (
              <ul className="flex flex-wrap gap-2.5" aria-label="Social links">
                {settings.socialLinks.map((link) => (
                  <li key={`${link.platform}-${link.url}`}>
                    <a
                      href={link.url}
                      aria-label={platformLabel(link.platform)}
                      {...(link.url.startsWith("https://")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className="flex size-[31px] items-center justify-center rounded-full border border-navy-foreground/30 transition-colors hover:border-accent hover:text-accent"
                    >
                      <SocialIcon platform={link.platform} className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 lg:contents">
            {footer.map((column, index) => (
              <nav key={index} aria-label={column.title || "Footer links"} className="space-y-5">
                {column.title && <h2 className="text-[13px] font-medium">{column.title}</h2>}
                <ul className="space-y-[13px] text-xs text-navy-foreground/65">
                  {column.items.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="transition-colors hover:text-accent"
                        {...(link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {hasContact && (
            <div className="space-y-5">
              <h2 className="text-[13px] font-medium">Get in touch</h2>
              <ul className="space-y-3.5 text-xs text-navy-foreground/65">
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex items-center gap-3 transition-colors hover:text-accent"
                    >
                      <Mail aria-hidden className="size-4 shrink-0 text-accent" />
                      <span className="break-all">{contactEmail}</span>
                    </a>
                  </li>
                )}
                {phone && (
                  <li>
                    <a
                      href={telHref(phone)}
                      className="flex items-center gap-3 transition-colors hover:text-accent"
                    >
                      <Phone aria-hidden className="size-4 shrink-0 text-accent" />
                      {phone}
                    </a>
                  </li>
                )}
                {locationLabel && (
                  <li className="flex items-center gap-3">
                    <MapPin aria-hidden className="size-4 shrink-0 text-accent" />
                    {settings.mapUrl ? (
                      <a
                        href={settings.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-accent"
                      >
                        {locationLabel}
                      </a>
                    ) : (
                      locationLabel
                    )}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-[62px] flex flex-col gap-4 border-t border-navy-foreground/10 pt-6 text-[11px] text-navy-foreground/45 lg:flex-row lg:items-center lg:justify-between">
          {settings.footerCopyright && <p>{settings.footerCopyright}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {settings.privacyHref && (
              <Link
                href={settings.privacyHref}
                className="transition-colors hover:text-navy-foreground"
              >
                Privacy Policy
              </Link>
            )}
            {settings.privacyHref && settings.termsHref && <span aria-hidden>·</span>}
            {settings.termsHref && (
              <Link
                href={settings.termsHref}
                className="transition-colors hover:text-navy-foreground"
              >
                Terms of Use
              </Link>
            )}
            <span aria-hidden className="hidden lg:inline">
              ·
            </span>
            <AccountLinks className="gap-3" linkClassName="hover:text-navy-foreground" />
          </div>
        </div>
      </SiteContainer>
    </footer>
  );
}
