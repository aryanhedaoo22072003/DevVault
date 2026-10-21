import mongoose, { type Model, Schema } from 'mongoose';

export interface DownloadActivity {
  userId: string;
  orderId: mongoose.Types.ObjectId;
  productId: string;
  assetId: mongoose.Types.ObjectId;
  downloadedAt: Date;
}

const downloadActivitySchema = new Schema<DownloadActivity>({
  userId: { type: String, required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  productId: { type: String, required: true },
  assetId: { type: Schema.Types.ObjectId, ref: 'DigitalAsset', required: true },
  downloadedAt: { type: Date, default: Date.now, index: true },
});

downloadActivitySchema.index({ userId: 1, downloadedAt: -1 });

export const DownloadActivityModel: Model<DownloadActivity> =
  mongoose.models.DownloadActivity || mongoose.model<DownloadActivity>('DownloadActivity', downloadActivitySchema);
