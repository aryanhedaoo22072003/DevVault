import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type EntitlementStatus = 'available' | 'awaiting_assets' | 'revoked';

export interface EntitlementDocument extends Document {
  userId: string;
  orderId: mongoose.Types.ObjectId;
  productId: string;
  productSlug: string;
  assetIds: mongoose.Types.ObjectId[];
  status: EntitlementStatus;
  provisionedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const entitlementSchema = new Schema<EntitlementDocument>({
  userId: { type: String, required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  productId: { type: String, required: true, trim: true, index: true },
  productSlug: { type: String, required: true, trim: true },
  assetIds: [{ type: Schema.Types.ObjectId, ref: 'DigitalAsset' }],
  status: { type: String, enum: ['available', 'awaiting_assets', 'revoked'], default: 'awaiting_assets', index: true },
  provisionedAt: { type: Date },
}, { timestamps: true });

entitlementSchema.index({ userId: 1, orderId: 1, productId: 1 }, { unique: true });

export const EntitlementModel: Model<EntitlementDocument> =
  mongoose.models.Entitlement || mongoose.model<EntitlementDocument>('Entitlement', entitlementSchema);
