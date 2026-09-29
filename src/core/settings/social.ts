import { z } from "zod";

export const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["key"];

const platformKeys = SOCIAL_PLATFORMS.map((p) => p.key) as [SocialPlatform, ...SocialPlatform[]];

/**
 * One social link. Web platforms need an https:// URL; email takes mailto: (or a bare address,
 * normalised to mailto:); phone takes tel: (or a number, normalised to tel:).
 */
export const socialLinkSchema = z
  .object({ platform: z.enum(platformKeys), url: z.string().trim().min(1, "Enter a link.") })
  .transform((link, ctx) => {
    const { platform } = link;
    let url = link.url;
    if (platform === "email") {
      url = url.startsWith("mailto:") ? url : `mailto:${url}`;
      if (!z.email().safeParse(url.slice("mailto:".length)).success) {
        ctx.addIssue({ code: "custom", message: "Enter a valid email address.", path: ["url"] });
      }
    } else if (platform === "phone") {
      url = url.startsWith("tel:") ? url : `tel:${url.replace(/[^\d+]/g, "")}`;
      if (!/^tel:\+?\d{5,15}$/.test(url)) {
        ctx.addIssue({ code: "custom", message: "Enter a valid phone number.", path: ["url"] });
      }
    } else if (!/^https:\/\/[^\s]+\.[^\s]+/.test(url)) {
      ctx.addIssue({ code: "custom", message: "Enter a full https:// link.", path: ["url"] });
    }
    return { platform, url };
  });

export const socialLinksSchema = z.array(socialLinkSchema).max(12, "Use at most 12 links.");

export type SocialLink = z.output<typeof socialLinkSchema>;

/** Parses stored links, dropping any that are invalid. */
export function parseSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = socialLinkSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
