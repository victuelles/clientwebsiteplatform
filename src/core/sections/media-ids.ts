/** Every media id found under a "mediaId" key in a props object (mirrors public.media_ids_in). */
export function mediaIdsIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) mediaIdsIn(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "mediaId" && typeof child === "string") found.add(child);
      else mediaIdsIn(child, found);
    }
  }
  return found;
}
