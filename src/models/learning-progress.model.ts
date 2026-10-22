import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type LearningAchievementKey = 'first-lesson' | 'quiz-starter' | 'python-explorer';

export interface StudentLearningProgressDocument extends Document {
  clerkUserId: string;
  enrollments: Array<{
    pathId: mongoose.Types.ObjectId;
    pathSlug: string;
    lastVisitedLessonId: string;
    lastVisitedLessonSlug: string;
    lastVisitedAt: Date;
  }>;
  completedLessons: Array<{
    pathId: mongoose.Types.ObjectId;
    pathSlug: string;
    moduleId: string;
    lessonId: string;
    lessonSlug: string;
    completedAt: Date;
  }>;
  quizAttempts: Array<{
    pathId: mongoose.Types.ObjectId;
    pathSlug: string;
    lessonId: string;
    score: number;
    total: number;
    percentage: number;
    attemptedAt: Date;
  }>;
  quizBestScores: Array<{
    pathId: mongoose.Types.ObjectId;
    lessonId: string;
    score: number;
    total: number;
    percentage: number;
    updatedAt: Date;
  }>;
  xp: number;
  achievements: Array<{
    key: LearningAchievementKey;
    title: string;
    description: string;
    xp: number;
    earnedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema({
  pathId: { type: Schema.Types.ObjectId, required: true }, pathSlug: { type: String, required: true, trim: true },
  lastVisitedLessonId: { type: String, required: true }, lastVisitedLessonSlug: { type: String, required: true, trim: true },
  lastVisitedAt: { type: Date, required: true },
}, { _id: false });
const completedLessonSchema = new Schema({
  pathId: { type: Schema.Types.ObjectId, required: true }, pathSlug: { type: String, required: true, trim: true },
  moduleId: { type: String, required: true }, lessonId: { type: String, required: true },
  lessonSlug: { type: String, required: true, trim: true }, completedAt: { type: Date, required: true },
}, { _id: false });
const quizAttemptSchema = new Schema({
  pathId: { type: Schema.Types.ObjectId, required: true }, pathSlug: { type: String, required: true, trim: true }, lessonId: { type: String, required: true },
  score: { type: Number, required: true, min: 0 }, total: { type: Number, required: true, min: 1 },
  percentage: { type: Number, required: true, min: 0, max: 100 }, attemptedAt: { type: Date, required: true },
}, { _id: false });
const quizBestSchema = new Schema({
  pathId: { type: Schema.Types.ObjectId, required: true }, lessonId: { type: String, required: true },
  score: { type: Number, required: true, min: 0 }, total: { type: Number, required: true, min: 1 },
  percentage: { type: Number, required: true, min: 0, max: 100 }, updatedAt: { type: Date, required: true },
}, { _id: false });
const achievementSchema = new Schema({
  key: { type: String, enum: ['first-lesson', 'quiz-starter', 'python-explorer'], required: true },
  title: { type: String, required: true }, description: { type: String, required: true },
  xp: { type: Number, required: true, min: 0 }, earnedAt: { type: Date, required: true },
}, { _id: false });

const studentLearningProgressSchema = new Schema<StudentLearningProgressDocument>({
  clerkUserId: { type: String, required: true, unique: true, index: true },
  enrollments: { type: [enrollmentSchema], default: [] },
  completedLessons: { type: [completedLessonSchema], default: [] },
  quizAttempts: { type: [quizAttemptSchema], default: [] },
  quizBestScores: { type: [quizBestSchema], default: [] },
  xp: { type: Number, default: 0, min: 0 },
  achievements: { type: [achievementSchema], default: [] },
}, { timestamps: true });

studentLearningProgressSchema.index({ clerkUserId: 1, 'completedLessons.lessonId': 1 });
studentLearningProgressSchema.index({ clerkUserId: 1, 'enrollments.pathId': 1 });

export const StudentLearningProgressModel: Model<StudentLearningProgressDocument> =
  mongoose.models.StudentLearningProgress || mongoose.model<StudentLearningProgressDocument>('StudentLearningProgress', studentLearningProgressSchema);
