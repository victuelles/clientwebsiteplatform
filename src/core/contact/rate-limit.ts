// A simple in-memory sliding-window limiter. Per server instance, so it is a speed bump for
// scripted spam, not a guarantee; stronger limits come with hardening (Phase 15).

const hits = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000,
  now = Date.now(),
): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
  return false;
}
