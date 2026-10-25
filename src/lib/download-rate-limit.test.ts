import { describe, expect, it } from 'vitest';

import { consumeDownloadRateLimit, DOWNLOAD_RATE_WINDOW_MS, type DownloadRateLimitStore, downloadRateKey, downloadRateWindow } from './download-rate-limit';

function sharedStore() {
  const counts = new Map<string, number>();
  const store: DownloadRateLimitStore = {
    async increment(key, windowStartedAt) {
      const bucket = `${key}:${windowStartedAt.getTime()}`;
      const value = (counts.get(bucket) ?? 0) + 1;
      counts.set(bucket, value);
      return value;
    },
  };
  return store;
}

describe('distributed download rate limiting', () => {
  it('uses opaque authenticated-user keys and fixed expiry windows', () => {
    expect(downloadRateKey('user_private')).toMatch(/^[a-f0-9]{64}$/);
    expect(downloadRateKey('user_private')).not.toContain('user_private');
    const first = downloadRateWindow(61_234);
    expect(first.windowStartedAt.getTime()).toBe(60_000);
    expect(first.expiresAt.getTime()).toBe(180_000);
  });

  it('limits repeated requests and permits a fresh expired window', async () => {
    const store = sharedStore();
    for (let index = 0; index < 10; index += 1) await expect(consumeDownloadRateLimit(store, 'user_one', 1_000)).resolves.toBe(true);
    await expect(consumeDownloadRateLimit(store, 'user_one', 1_000)).resolves.toBe(false);
    await expect(consumeDownloadRateLimit(store, 'user_one', DOWNLOAD_RATE_WINDOW_MS + 1_000)).resolves.toBe(true);
  });

  it('shares counters between limiter instances and handles concurrent requests atomically', async () => {
    const store = sharedStore();
    const instanceOne = (now: number) => consumeDownloadRateLimit(store, 'user_shared', now);
    const instanceTwo = (now: number) => consumeDownloadRateLimit(store, 'user_shared', now);
    const outcomes = await Promise.all(Array.from({ length: 12 }, (_, index) => (index % 2 ? instanceOne(5_000) : instanceTwo(5_000))));
    expect(outcomes.filter(Boolean)).toHaveLength(10);
    expect(outcomes.filter((allowed) => !allowed)).toHaveLength(2);
  });

  it('isolates users and fails closed when the shared backend errors', async () => {
    const store = sharedStore();
    for (let index = 0; index < 10; index += 1) await consumeDownloadRateLimit(store, 'user_one', 5_000);
    await expect(consumeDownloadRateLimit(store, 'user_two', 5_000)).resolves.toBe(true);
    await expect(consumeDownloadRateLimit({ increment: async () => { throw new Error('offline'); } }, 'user_one')).resolves.toBe(false);
  });
});
