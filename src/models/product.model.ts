import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type ProductType = 'digital-product' | 'course' | 'template' | 'bundle' | 'practice-lab';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductDocument extends Document {
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  categorySlug?: string;
  productType: ProductType;
  format: string;
  priceInr: number;
  currency: 'INR';
  imageUrl: string;
  badge: string;
  featured: boolean;
  demoIncluded: boolean;
  languages: string[];
  frameworks: string[];
  tags: string[];
  screenshots: string[];
  ownerId?: mongoose.Types.ObjectId;
  status: ProductStatus;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    summary: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    categorySlug: { type: String, default: '', trim: true },
    productType: {
      type: String,
      enum: ['digital-product', 'course', 'template', 'bundle', 'practice-lab'],
      default: 'digital-product',
    },
    format: { type: String, required: true, trim: true },
    priceInr: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    imageUrl: { type: String, required: true, trim: true },
    badge: { type: String, default: 'New', trim: true },
    featured: { type: Boolean, default: false },
    demoIncluded: { type: Boolean, default: true },
    languages: [{ type: String, trim: true }],
    frameworks: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    screenshots: [{ type: String, trim: true }],
    ownerId: { type: Schema.Types.ObjectId, ref: 'UserProfile', default: null },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, status: 1, isPublished: 1, featured: -1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ title: 'text', summary: 'text', description: 'text', tags: 'text' });

export const ProductModel: Model<ProductDocument> =
  mongoose.models.Product || mongoose.model<ProductDocument>('Product', productSchema);
