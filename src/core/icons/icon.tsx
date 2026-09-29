import { ICONS, isIconKey } from "./registry";

/** Renders a curated icon by key; unknown keys render nothing. */
export function SiteIcon({
  name,
  className,
  strokeWidth = 1.75,
}: {
  name: string | null | undefined;
  className?: string;
  strokeWidth?: number;
}) {
  if (!isIconKey(name)) return null;
  const Icon = ICONS[name].icon;
  return <Icon aria-hidden className={className} strokeWidth={strokeWidth} />;
}
