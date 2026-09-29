import "server-only";

import type { MediaAsset } from "@/core/media/types";
import { listFeedProviders } from "@/core/modules/registry.server";

// Module feed providers. A module declares a feed in its manifest (`feeds`) and implements it in
// module.server.ts (`feedProviders`) so the "Module feed" section can show its latest items.

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

export function getFeedProvider(key: string): FeedProvider | undefined {
  return listFeedProviders().find((provider) => provider.key === key);
}

/** Options for the section's "Source" select. */
export function feedSourceOptions(): { value: string; label: string }[] {
  return listFeedProviders().map((provider) => ({ value: provider.key, label: provider.label }));
}
