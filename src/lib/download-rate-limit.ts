const WINDOW_MS = 60_000;
const MAX_DOWNLOADS = 10;
const buckets = new Map<string, number[]>();

export function allowDownload(userId: string, now = Date.now()) {
  const recent = (buckets.get(userId) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_DOWNLOADS) {
    buckets.set(userId, recent);
    return false;
  }
  recent.push(now);
  buckets.set(userId, recent);
  return true;
}

export function resetDownloadRateLimits() {
  buckets.clear();
}
