import mongoose, { type Document, type Model, Schema } from 'mongoose';
import type { ChallengeLanguage } from '@/models/coding-challenge.model';

export interface ChallengeSubmissionDocument extends Document {
  clerkUserId: string; challengeId: mongoose.Types.ObjectId; challengeSlug: string; challengeTitle: string;
  language: ChallengeLanguage; sourceCode: string; status: 'running' | 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'service_error';
  passedTests: number; totalTests: number; runtimeSeconds?: number; memoryKb?: number; xpAwarded: number; createdAt: Date; updatedAt: Date;
}

const challengeSubmissionSchema = new Schema<ChallengeSubmissionDocument>({
  clerkUserId: { type: String, required: true, index: true },
  challengeId: { type: Schema.Types.ObjectId, ref: 'CodingChallenge', required: true, index: true },
  challengeSlug: { type: String, required: true, trim: true }, challengeTitle: { type: String, required: true, trim: true },
  language: { type: String, enum: ['python', 'javascript'], required: true },
  sourceCode: { type: String, required: true, maxlength: 30_000, select: false },
  status: { type: String, enum: ['running','accepted','wrong_answer','compile_error','runtime_error','time_limit','service_error'], default: 'running', index: true },
  passedTests: { type: Number, default: 0, min: 0 }, totalTests: { type: Number, default: 0, min: 0 },
  runtimeSeconds: { type: Number, min: 0 }, memoryKb: { type: Number, min: 0 }, xpAwarded: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

challengeSubmissionSchema.index({ clerkUserId: 1, createdAt: -1 });
challengeSubmissionSchema.index({ clerkUserId: 1, challengeId: 1, updatedAt: -1 });

export const ChallengeSubmissionModel: Model<ChallengeSubmissionDocument> =
  mongoose.models.ChallengeSubmission || mongoose.model<ChallengeSubmissionDocument>('ChallengeSubmission', challengeSubmissionSchema);
