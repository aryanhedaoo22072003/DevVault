import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type DigitalAssetType = 'screenshot' | 'video' | 'zip' | 'notebook' | 'guide' | 'repo';

export interface DigitalAssetDocument extends Document {
  product: mongoose.Types.ObjectId;
  title: string;
  assetType: DigitalAssetType;
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  version?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const digitalAssetSchema = new Schema<DigitalAssetDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    title: { type: String, required: true, trim: true },
    assetType: {
      type: String,
      enum: ['screenshot', 'video', 'zip', 'notebook', 'guide', 'repo'],
      default: 'guide',
    },
    url: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: '' },
    fileSize: { type: Number, default: 0, min: 0 },
    version: { type: String, default: '1.0.0' },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const DigitalAssetModel: Model<DigitalAssetDocument> =
  mongoose.models.DigitalAsset || mongoose.model<DigitalAssetDocument>('DigitalAsset', digitalAssetSchema);
