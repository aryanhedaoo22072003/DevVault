import mongoose, { type Document, type Model, Schema } from "mongoose";
import type { ChallengeLanguage } from "./coding-challenge.model";

type Draft = { code: string; updatedAt: Date };
export type LocalPracticeRun = {
  language: "python" | "javascript";
  codeHash: string;
  runAt: Date;
  passedTests: number;
  totalTests: number;
  outcome: "passed" | "failed" | "error";
  verified: false;
};
export type PracticeDraftLanguage =
  ChallengeLanguage | "sql" | "typescript" | "c" | "cpp" | "java";
export interface ChallengePracticeDocument extends Document {
  clerkUserId: string;
  challengeId: mongoose.Types.ObjectId;
  challengeSlug: string;
  bookmarked: boolean;
  viewedAt?: Date;
  drafts: {
    python?: Draft;
    javascript?: Draft;
    sql?: Draft;
    typescript?: Draft;
    c?: Draft;
    cpp?: Draft;
    java?: Draft;
  };
  draftStartedLanguages: PracticeDraftLanguage[];
  localAttemptedLanguages: Array<"python" | "javascript">;
  localRuns: LocalPracticeRun[];
  practicePassed: {
    python?: { codeHash: string; passedAt: Date };
    javascript?: { codeHash: string; passedAt: Date };
  };
  createdAt: Date;
  updatedAt: Date;
}

const draftSchema = new Schema(
  {
    code: { type: String, required: true, maxlength: 30_000 },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);
const localRunSchema = new Schema(
  {
    language: { type: String, enum: ["python", "javascript"], required: true },
    codeHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    runAt: { type: Date, required: true },
    passedTests: { type: Number, required: true, min: 0, max: 20 },
    totalTests: { type: Number, required: true, min: 0, max: 20 },
    outcome: {
      type: String,
      enum: ["passed", "failed", "error"],
      required: true,
    },
    verified: {
      type: Boolean,
      required: true,
      default: false,
      immutable: true,
    },
  },
  { _id: false },
);
const passSchema = new Schema(
  {
    codeHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    passedAt: { type: Date, required: true },
  },
  { _id: false },
);
const challengePracticeSchema = new Schema<ChallengePracticeDocument>(
  {
    clerkUserId: { type: String, required: true, trim: true },
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: "CodingChallenge",
      required: true,
    },
    challengeSlug: { type: String, required: true, trim: true, maxlength: 180 },
    bookmarked: { type: Boolean, default: false },
    viewedAt: Date,
    drafts: {
      python: { type: draftSchema, required: false },
      javascript: { type: draftSchema, required: false },
      sql: { type: draftSchema, required: false },
      typescript: { type: draftSchema, required: false },
      c: { type: draftSchema, required: false },
      cpp: { type: draftSchema, required: false },
      java: { type: draftSchema, required: false },
    },
    draftStartedLanguages: {
      type: [String],
      enum: ["python", "javascript", "sql", "typescript", "c", "cpp", "java"],
      default: [],
    },
    localAttemptedLanguages: {
      type: [String],
      enum: ["python", "javascript"],
      default: [],
    },
    localRuns: { type: [localRunSchema], default: [] },
    practicePassed: {
      python: { type: passSchema, required: false },
      javascript: { type: passSchema, required: false },
    },
  },
  { timestamps: true },
);

challengePracticeSchema.index(
  { clerkUserId: 1, challengeId: 1 },
  { unique: true },
);
challengePracticeSchema.index({ clerkUserId: 1, bookmarked: 1, updatedAt: -1 });
challengePracticeSchema.index({ clerkUserId: 1, viewedAt: -1 });
challengePracticeSchema.index({ clerkUserId: 1, "localRuns.runAt": -1 });

const cachedChallengePractice = mongoose.models.ChallengePractice as
  Model<ChallengePracticeDocument> | undefined;
if (
  cachedChallengePractice &&
  (!cachedChallengePractice.schema.path("localRuns") ||
    !cachedChallengePractice.schema.path("practicePassed.python") ||
    !cachedChallengePractice.schema.path("localAttemptedLanguages"))
)
  mongoose.deleteModel("ChallengePractice");

export const ChallengePracticeModel: Model<ChallengePracticeDocument> =
  (mongoose.models.ChallengePractice as
    Model<ChallengePracticeDocument> | undefined) ||
  mongoose.model<ChallengePracticeDocument>(
    "ChallengePractice",
    challengePracticeSchema,
  );
