import mongoose, { type Document, type Model, Schema } from 'mongoose';
import type { ChallengeLanguage } from './coding-challenge.model';

type Draft = { code: string; updatedAt: Date };
export interface ChallengePracticeDocument extends Document {
  clerkUserId: string;
  challengeId: mongoose.Types.ObjectId;
  challengeSlug: string;
  bookmarked: boolean;
  viewedAt?: Date;
  drafts: { python?: Draft; javascript?: Draft };
  draftStartedLanguages: ChallengeLanguage[];
  createdAt: Date;
  updatedAt: Date;
}

const draftSchema = new Schema({ code: { type: String, required: true, maxlength: 30_000 }, updatedAt: { type: Date, required: true } }, { _id: false });
const challengePracticeSchema = new Schema<ChallengePracticeDocument>({
  clerkUserId: { type: String, required: true, trim: true },
  challengeId: { type: Schema.Types.ObjectId, ref: 'CodingChallenge', required: true },
  challengeSlug: { type: String, required: true, trim: true, maxlength: 180 },
  bookmarked: { type: Boolean, default: false },
  viewedAt: Date,
  drafts: { python: { type: draftSchema, required: false }, javascript: { type: draftSchema, required: false } },
  draftStartedLanguages: { type: [String], enum: ['python', 'javascript'], default: [] },
}, { timestamps: true });

challengePracticeSchema.index({ clerkUserId: 1, challengeId: 1 }, { unique: true });
challengePracticeSchema.index({ clerkUserId: 1, bookmarked: 1, updatedAt: -1 });
challengePracticeSchema.index({ clerkUserId: 1, viewedAt: -1 });

export const ChallengePracticeModel: Model<ChallengePracticeDocument> = mongoose.models.ChallengePractice || mongoose.model<ChallengePracticeDocument>('ChallengePractice', challengePracticeSchema);
