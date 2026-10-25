import { createHash } from 'node:crypto';

import { connectToDatabase } from '@/lib/db';
import { hasMongoConfig } from '@/lib/env';
import { DownloadRateLimitModel } from '@/models/download-rate-limit.model';

export const DOWNLOAD_RATE_WINDOW_MS = 60_000;
export const MAX_DOWNLOADS_PER_WINDOW = 10;

export interface DownloadRateLimitStore {
  increment(key: string, windowStartedAt: Date, expiresAt: Date): Promise<number>;
}

export function downloadRateWindow(now: number) {
  const startedAt = Math.floor(now / DOWNLOAD_RATE_WINDOW_MS) * DOWNLOAD_RATE_WINDOW_MS;
  return { windowStartedAt: new Date(startedAt), expiresAt: new Date(startedAt + DOWNLOAD_RATE_WINDOW_MS * 2) };
}

export function downloadRateKey(userId: string) {
  return createHash('sha256').update(`download:${userId}`).digest('hex');
}

export async function consumeDownloadRateLimit(store: DownloadRateLimitStore, userId: string, now = Date.now(), limit = MAX_DOWNLOADS_PER_WINDOW) {
  if (!userId || !Number.isSafeInteger(limit) || limit <= 0) return false;
  const window = downloadRateWindow(now);
  try {
    const count = await store.increment(downloadRateKey(userId), window.windowStartedAt, window.expiresAt);
    return Number.isSafeInteger(count) && count <= limit;
  } catch {
    return false;
  }
}

const localCounts = new Map<string, number>();
const localStore: DownloadRateLimitStore = {
  async increment(key, windowStartedAt) {
    const bucket = `${key}:${windowStartedAt.getTime()}`;
    const next = (localCounts.get(bucket) ?? 0) + 1;
    localCounts.set(bucket, next);
    return next;
  },
};

const mongoStore: DownloadRateLimitStore = {
  async increment(key, windowStartedAt, expiresAt) {
    const record = await DownloadRateLimitModel.findOneAndUpdate(
      { key, windowStartedAt },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    if (!record) throw new Error('Rate-limit counter was not persisted.');
    return record.count;
  },
};

export async function allowDownload(userId: string, now = Date.now()) {
  if (!hasMongoConfig) {
    if (process.env.NODE_ENV === 'production') return false;
    return consumeDownloadRateLimit(localStore, userId, now);
  }
  try {
    await connectToDatabase();
    return await consumeDownloadRateLimit(mongoStore, userId, now);
  } catch {
    return false;
  }
}

export function resetDownloadRateLimits() {
  localCounts.clear();
}
