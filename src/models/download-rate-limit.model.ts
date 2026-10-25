import mongoose, { type Model, Schema } from 'mongoose';

export interface DownloadRateLimitDocument {
  key: string;
  windowStartedAt: Date;
  count: number;
  expiresAt: Date;
}

const schema = new Schema<DownloadRateLimitDocument>({
  key: { type: String, required: true },
  windowStartedAt: { type: Date, required: true },
  count: { type: Number, required: true, min: 0, default: 0 },
  expiresAt: { type: Date, required: true },
});

schema.index({ key: 1, windowStartedAt: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DownloadRateLimitModel: Model<DownloadRateLimitDocument> =
  mongoose.models.DownloadRateLimit || mongoose.model<DownloadRateLimitDocument>('DownloadRateLimit', schema);
