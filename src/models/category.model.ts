import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface CategoryDocument extends Document {
  name: string;
  slug: string;
  description: string;
  parentCategory?: mongoose.Types.ObjectId | null;
  categoryType: 'technology' | 'topic' | 'bundle';
  languages: string[];
  frameworks: string[];
  seoTags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    description: { type: String, required: true, trim: true },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    categoryType: { type: String, enum: ['technology', 'topic', 'bundle'], default: 'technology' },
    languages: [{ type: String, trim: true }],
    frameworks: [{ type: String, trim: true }],
    seoTags: [{ type: String, trim: true }],
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ parentCategory: 1, slug: 1 }, { unique: true });
categorySchema.index({ isPublic: 1, name: 1 });

export const CategoryModel: Model<CategoryDocument> =
  mongoose.models.Category || mongoose.model<CategoryDocument>('Category', categorySchema);
