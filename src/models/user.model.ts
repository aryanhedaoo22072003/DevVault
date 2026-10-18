import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type UserRole = 'customer' | 'admin';

export interface UserProfileDocument extends Document {
  clerkId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  bio?: string;
  isOnboarded: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new Schema<UserProfileDocument>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    bio: { type: String, default: '' },
    isOnboarded: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const UserProfileModel: Model<UserProfileDocument> =
  mongoose.models.UserProfile || mongoose.model<UserProfileDocument>('UserProfile', userProfileSchema);

export const UserModel = UserProfileModel;
