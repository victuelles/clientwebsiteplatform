import Link from "next/link";

import { ActionLink } from "@/components/shared/action-link";
import { DEFAULT_HEADER_LINKS } from "@/core/navigation/defaults";
import type { SiteSettings } from "@/core/settings/get-settings";

import { AccountLinks } from "./account-link";
import { SiteContainer } from "./container";
import { HeaderNav, MobileMenu } from "./header-nav";
import { Logo } from "./logo";

/** Navy header: logo, links, and the CTA; a hamburger sheet below the lg breakpoint. */
export function SiteHeader({ settings }: { settings: SiteSettings }) {
  // The header is navy, so prefer the logo made for dark backgrounds.
  const logoAsset = settings.logoOnDark ?? settings.logo;
  const logo = (
    <Link href="/" className="shrink-0" aria-label={`${settings.siteName} home`}>
      <Logo siteName={settings.siteName} asset={logoAsset} tone="dark" />
    </Link>
  );
  const cta =
    settings.headerCtaLabel && settings.headerCtaHref
      ? { label: settings.headerCtaLabel, href: settings.headerCtaHref }
      : null;

  return (
    <header className="bg-navy text-navy-foreground" data-testid="site-header">
      <SiteContainer className="flex h-[66px] items-center justify-between gap-6 lg:h-[76px]">
        {logo}
        <HeaderNav links={DEFAULT_HEADER_LINKS} />
        {cta ? (
          <ActionLink
            href={cta.href}
            variant="accent"
            arrow="up-right"
            className="hidden lg:inline-flex"
          >
            {cta.label}
          </ActionLink>
        ) : (
          <span className="hidden lg:block" />
        )}
        <MobileMenu
          links={DEFAULT_HEADER_LINKS}
          cta={cta}
          logo={<Logo siteName={settings.siteName} asset={logoAsset} tone="dark" />}
          account={<AccountLinks />}
        />
      </SiteContainer>
    </header>
  );
}
