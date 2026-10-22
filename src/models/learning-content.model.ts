import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type LearningContentStatus = 'draft' | 'published' | 'archived';

export interface LearningLesson {
  _id?: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  order: number;
  markdown: string;
  codeExamples: Array<{ language: string; code: string }>;
  flowcharts: Array<{ title: string; definition: string }>;
  quizQuestions: Array<{ prompt: string; choices: string[]; answerIndex: number; explanation: string }>;
  exercises: Array<{ title: string; instructions: string; expectedOutcomes: string[]; starterCode: string; language: string }>;
  status: LearningContentStatus;
}

export interface LearningModule {
  _id?: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  order: number;
  lessons: LearningLesson[];
}

export interface LearningPathDocument extends Document {
  title: string;
  slug: string;
  subject: string;
  description: string;
  status: LearningContentStatus;
  access: 'public' | 'authenticated' | 'paid';
  productId?: string;
  modules: LearningModule[];
  createdAt: Date;
  updatedAt: Date;
}

const codeExampleSchema = new Schema({ language: { type: String, trim: true }, code: { type: String, maxlength: 30_000 } }, { _id: false });
const flowchartSchema = new Schema({ title: { type: String, trim: true }, definition: { type: String, maxlength: 20_000 } }, { _id: false });
const quizSchema = new Schema({
  prompt: { type: String, trim: true, maxlength: 2_000 },
  choices: [{ type: String, trim: true, maxlength: 500 }],
  answerIndex: { type: Number, min: 0 },
  explanation: { type: String, trim: true, maxlength: 4_000 },
}, { _id: false });
const exerciseSchema = new Schema({
  title: { type: String, trim: true }, instructions: { type: String, maxlength: 10_000 },
  expectedOutcomes: [{ type: String, trim: true, maxlength: 500 }],
  starterCode: { type: String, maxlength: 30_000 }, language: { type: String, trim: true },
}, { _id: false });
const lessonSchema = new Schema<LearningLesson>({
  title: { type: String, required: true, trim: true }, slug: { type: String, required: true, trim: true },
  order: { type: Number, required: true, min: 0 }, markdown: { type: String, default: '', maxlength: 100_000 },
  codeExamples: { type: [codeExampleSchema], default: [] }, flowcharts: { type: [flowchartSchema], default: [] },
  quizQuestions: { type: [quizSchema], default: [] }, exercises: { type: [exerciseSchema], default: [] },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
}, { _id: true });
const moduleSchema = new Schema<LearningModule>({
  title: { type: String, required: true, trim: true }, slug: { type: String, required: true, trim: true },
  order: { type: Number, required: true, min: 0 }, lessons: { type: [lessonSchema], default: [] },
}, { _id: true });

const learningPathSchema = new Schema<LearningPathDocument>({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  subject: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  access: { type: String, enum: ['public', 'authenticated', 'paid'], default: 'public', index: true },
  productId: { type: String, default: '', trim: true },
  modules: { type: [moduleSchema], default: [] },
}, { timestamps: true });

learningPathSchema.index({ status: 1, updatedAt: -1 });
learningPathSchema.index({ title: 'text', subject: 'text', description: 'text' });

export const LearningPathModel: Model<LearningPathDocument> =
  mongoose.models.LearningPath || mongoose.model<LearningPathDocument>('LearningPath', learningPathSchema);
