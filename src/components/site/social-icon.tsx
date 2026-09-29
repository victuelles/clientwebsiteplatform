import { Mail, Phone } from "lucide-react";

import type { SocialPlatform } from "@/core/settings/social";

// Brand glyphs drawn in the same stroke style as lucide (which no longer ships brand icons).

function Stroke({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  switch (platform) {
    case "email":
      return <Mail aria-hidden className={className} />;
    case "phone":
      return <Phone aria-hidden className={className} />;
    case "facebook":
      return (
        <Stroke className={className}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </Stroke>
      );
    case "instagram":
      return (
        <Stroke className={className}>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <path d="M17.5 6.5h.01" />
        </Stroke>
      );
    case "linkedin":
      return (
        <Stroke className={className}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </Stroke>
      );
    case "x":
      return (
        <Stroke className={className}>
          <path d="M4 4l16 16M20 4L4 20" />
        </Stroke>
      );
    case "youtube":
      return (
        <Stroke className={className}>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="M10 9l5 3-5 3z" />
        </Stroke>
      );
    case "tiktok":
      return (
        <Stroke className={className}>
          <path d="M15 3v11.5a4.5 4.5 0 1 1-4.5-4.5" />
          <path d="M15 3c.6 2.6 2.6 4.4 5 4.5" />
        </Stroke>
      );
  }
}
