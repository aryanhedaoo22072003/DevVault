import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type DigitalAssetType = 'screenshot' | 'video' | 'pdf' | 'zip' | 'notebook' | 'guide' | 'repo' | 'other';

export interface DigitalAssetDocument extends Document {
  product: mongoose.Types.ObjectId;
  title: string;
  assetType: DigitalAssetType;
  url?: string;
  storageProvider: 'local-private' | 's3-private';
  storageKey?: string;
  originalFilename?: string;
  mimeType?: string;
  thumbnailUrl?: string;
  fileSize: number;
  version?: string;
  isPublic: boolean;
  isActive: boolean;
  replacesAssetId?: mongoose.Types.ObjectId;
  replacedByAssetId?: mongoose.Types.ObjectId;
  replacedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const digitalAssetSchema = new Schema<DigitalAssetDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    title: { type: String, required: true, trim: true },
    assetType: {
      type: String,
      enum: ['screenshot', 'video', 'pdf', 'zip', 'notebook', 'guide', 'repo', 'other'],
      default: 'guide',
    },
    url: { type: String, default: '', trim: true },
    storageProvider: { type: String, enum: ['local-private', 's3-private'], default: 'local-private' },
    storageKey: { type: String, default: '', trim: true },
    originalFilename: { type: String, default: '', trim: true },
    mimeType: { type: String, default: '', trim: true },
    thumbnailUrl: { type: String, default: '' },
    fileSize: { type: Number, default: 0, min: 0 },
    version: { type: String, default: '1.0.0' },
    isPublic: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    replacesAssetId: { type: Schema.Types.ObjectId, ref: 'DigitalAsset' },
    replacedByAssetId: { type: Schema.Types.ObjectId, ref: 'DigitalAsset' },
    replacedAt: Date,
  },
  { timestamps: true },
);

digitalAssetSchema.index({ product: 1, isPublic: 1, isActive: 1 });
digitalAssetSchema.index({ isActive: 1, createdAt: -1 });

export const DigitalAssetModel: Model<DigitalAssetDocument> =
  mongoose.models.DigitalAsset || mongoose.model<DigitalAssetDocument>('DigitalAsset', digitalAssetSchema);
