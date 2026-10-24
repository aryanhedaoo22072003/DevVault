import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeLanguage = 'python' | 'javascript';
export type ChallengeStatus = 'draft' | 'published' | 'archived';

export interface CodingChallengeDocument extends Document {
  title: string; slug: string; summary: string; statement: string;
  difficulty: ChallengeDifficulty; topic: string; tags: string[];
  supportedLanguages: ChallengeLanguage[];
  entrypoint: string;
  starterCode: Array<{ language: ChallengeLanguage; code: string }>;
  examples: Array<{ input: string; output: string; explanation: string }>;
  constraints: string[];
  explanation: string;
  timeComplexity: string;
  spaceComplexity: string;
  trackSlugs: string[];
  sampleTestCases: Array<{ input: string; expectedOutput: string }>;
  privateTestCases: Array<{ input: string; expectedOutput: string }>;
  referenceSolutions: Array<{ language: ChallengeLanguage; code: string }>;
  status: ChallengeStatus; publishedAt?: Date; createdAt: Date; updatedAt: Date;
}

const languageCodeSchema = new Schema({ language: { type: String, enum: ['python', 'javascript'], required: true }, code: { type: String, required: true, maxlength: 30_000 } }, { _id: false });
const exampleSchema = new Schema({ input: { type: String, required: true, maxlength: 4_000 }, output: { type: String, required: true, maxlength: 4_000 }, explanation: { type: String, default: '', maxlength: 8_000 } }, { _id: false });
const testCaseSchema = new Schema({ input: { type: String, required: true, maxlength: 4_000 }, expectedOutput: { type: String, required: true, maxlength: 4_000 } }, { _id: false });

const codingChallengeSchema = new Schema<CodingChallengeDocument>({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, trim: true, maxlength: 180 },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  statement: { type: String, required: true, maxlength: 30_000 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, index: true },
  topic: { type: String, required: true, trim: true, maxlength: 100, index: true },
  tags: { type: [String], default: [] },
  supportedLanguages: { type: [String], enum: ['python', 'javascript'], default: ['python', 'javascript'], index: true },
  entrypoint: { type: String, required: true, trim: true, maxlength: 100 },
  starterCode: { type: [languageCodeSchema], default: [] }, examples: { type: [exampleSchema], default: [] },
  constraints: { type: [String], default: [] }, sampleTestCases: { type: [testCaseSchema], default: [] },
  explanation: { type: String, default: '', maxlength: 30_000 },
  timeComplexity: { type: String, default: '', maxlength: 500 },
  spaceComplexity: { type: String, default: '', maxlength: 500 },
  trackSlugs: { type: [String], default: [] },
  privateTestCases: { type: [testCaseSchema], default: [], select: false },
  referenceSolutions: { type: [languageCodeSchema], default: [], select: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  publishedAt: { type: Date },
}, { timestamps: true });

codingChallengeSchema.index({ status: 1, difficulty: 1, topic: 1, updatedAt: -1 });
codingChallengeSchema.index({ title: 'text', summary: 'text', topic: 'text', tags: 'text' });

const cachedChallengeModel = mongoose.models.CodingChallenge as Model<CodingChallengeDocument> | undefined;
// Next.js development hot reload can retain a model compiled from an older schema.
// Recompile only when the additive Stage 11 fields are absent so reads do not
// silently discard seeded metadata.
if (cachedChallengeModel && (!cachedChallengeModel.schema.path('trackSlugs') || !cachedChallengeModel.schema.path('referenceSolutions'))) {
  delete mongoose.models.CodingChallenge;
}
export const CodingChallengeModel: Model<CodingChallengeDocument> =
  (mongoose.models.CodingChallenge as Model<CodingChallengeDocument> | undefined) || mongoose.model<CodingChallengeDocument>('CodingChallenge', codingChallengeSchema);
