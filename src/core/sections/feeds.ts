import "server-only";

import type { MediaAsset } from "@/core/media/types";

// Module feed providers. A module (Phase 6+: blog) registers a provider so the "Module feed"
// section can show its latest items. The registry is empty until then.

export type FeedCard = {
  id: string;
  image: MediaAsset | null;
  category: string | null;
  /** ISO date. */
  date: string | null;
  title: string;
  href: string;
};

export type FeedProvider = {
  /** Stored in the section's "source" prop. */
  key: string;
  /** The module that must be enabled for the feed to show. */
  moduleKey: string;
  label: string;
  /** Latest items, newest first. Runs on the server. */
  getItems: (limit: number) => Promise<FeedCard[]>;
};

export const FEED_PROVIDERS: FeedProvider[] = [];

export function getFeedProvider(key: string): FeedProvider | undefined {
  return FEED_PROVIDERS.find((provider) => provider.key === key);
}

/** Options for the section's "Source" select. */
export function feedSourceOptions(): { value: string; label: string }[] {
  return FEED_PROVIDERS.map((provider) => ({ value: provider.key, label: provider.label }));
}
