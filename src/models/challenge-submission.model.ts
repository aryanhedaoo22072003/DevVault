import mongoose, { type Document, type Model, Schema } from 'mongoose';
import type { ChallengeLanguage } from '@/models/coding-challenge.model';

export interface ChallengeSubmissionDocument extends Document {
  clerkUserId: string; challengeId: mongoose.Types.ObjectId; challengeSlug: string; challengeTitle: string;
  language: ChallengeLanguage; sourceCode: string; status: 'saved'; createdAt: Date; updatedAt: Date;
}

const challengeSubmissionSchema = new Schema<ChallengeSubmissionDocument>({
  clerkUserId: { type: String, required: true, index: true },
  challengeId: { type: Schema.Types.ObjectId, ref: 'CodingChallenge', required: true, index: true },
  challengeSlug: { type: String, required: true, trim: true }, challengeTitle: { type: String, required: true, trim: true },
  language: { type: String, enum: ['python', 'javascript'], required: true },
  sourceCode: { type: String, required: true, maxlength: 30_000, select: false },
  status: { type: String, enum: ['saved'], default: 'saved' },
}, { timestamps: true });

challengeSubmissionSchema.index({ clerkUserId: 1, createdAt: -1 });
challengeSubmissionSchema.index({ clerkUserId: 1, challengeId: 1, updatedAt: -1 });

export const ChallengeSubmissionModel: Model<ChallengeSubmissionDocument> =
  mongoose.models.ChallengeSubmission || mongoose.model<ChallengeSubmissionDocument>('ChallengeSubmission', challengeSubmissionSchema);
