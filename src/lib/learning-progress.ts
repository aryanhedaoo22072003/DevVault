import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { buildPaidLearningAccessFilter, canOpenLearningPath, publishedLearningPathFilter } from '@/lib/learning';
import { LearningPathModel, type LearningLesson, type LearningModule } from '@/models/learning-content.model';
import { StudentLearningProgressModel, type LearningAchievementKey } from '@/models/learning-progress.model';
import { OrderModel } from '@/models/order.model';

export const ACHIEVEMENTS = {
  'first-lesson': { title: 'First Lesson', description: 'Completed your first DevVault lesson.', xp: 100 },
  'quiz-starter': { title: 'Quiz Starter', description: 'Submitted your first scored quiz.', xp: 50 },
  'python-explorer': { title: 'Python Explorer', description: 'Completed a lesson in the Python learning path.', xp: 75 },
} as const;

export const quizSubmissionSchema = z.object({
  pathSlug: z.string().trim().min(1).max(180), lessonRef: z.string().trim().min(1).max(180),
  answers: z.array(z.number().int().min(0)).max(50),
});
export const lessonProgressSchema = z.object({ pathSlug: z.string().trim().min(1).max(180), lessonRef: z.string().trim().min(1).max(180) });

export function calculateLearningProgress(completedLessonIds: Iterable<string>, lessonIds: Iterable<string>) {
  const completed = new Set(completedLessonIds); const lessons = [...lessonIds];
  const completedCount = lessons.filter((id) => completed.has(id)).length;
  return { completed: completedCount, total: lessons.length, percentage: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0 };
}

export function scoreQuiz(questions: Array<{ choices: string[]; answerIndex: number; explanation: string }>, answers: number[]) {
  if (!questions.length || answers.length !== questions.length) throw new Error('Answer every question before submitting.');
  answers.forEach((answer, index) => { if (!Number.isInteger(answer) || answer < 0 || answer >= questions[index].choices.length) throw new Error(`Invalid answer for question ${index + 1}.`); });
  const feedback = questions.map((question, index) => ({ correct: answers[index] === question.answerIndex, explanation: question.explanation }));
  const score = feedback.filter((item) => item.correct).length;
  return { score, total: questions.length, percentage: Math.round((score / questions.length) * 100), feedback };
}

export function buildProgressOwnerFilter(clerkUserId: string) { return { clerkUserId }; }
export function buildAchievementAwardFilter(clerkUserId: string, key: LearningAchievementKey) { return { clerkUserId, 'achievements.key': { $ne: key } }; }

export function findPublishedLesson<T extends { modules: LearningModule[] }>(path: T, lessonRef: string) {
  for (const learningModule of path.modules) {
    const lesson = learningModule.lessons.find((candidate) =>
      candidate.status === 'published' && (candidate.slug === lessonRef || String(candidate._id) === lessonRef));
    if (lesson) return { path, learningModule, lesson };
  }
  return null;
}

export async function getAuthorizedPublishedLesson(pathSlug: string, lessonRef: string, clerkUserId: string) {
  await connectToDatabase();
  const path = await LearningPathModel.findOne(publishedLearningPathFilter(pathSlug)).lean();
  if (!path) return null;
  let ownsPaidProduct = false;
  if (path.access === 'paid' && path.productId) ownsPaidProduct = Boolean(await OrderModel.exists(buildPaidLearningAccessFilter(clerkUserId, path.productId)));
  if (!canOpenLearningPath(path.access, clerkUserId, ownsPaidProduct)) return null;
  return findPublishedLesson(path, lessonRef);
}

async function ensureProgress(clerkUserId: string) {
  await StudentLearningProgressModel.updateOne(buildProgressOwnerFilter(clerkUserId), { $setOnInsert: { clerkUserId } }, { upsert: true });
}

export async function recordLessonVisit(clerkUserId: string, context: { path: { _id: unknown; slug: string }; lesson: LearningLesson }) {
  await ensureProgress(clerkUserId); const now = new Date();
  const enrollment = { pathId: context.path._id, pathSlug: context.path.slug, lastVisitedLessonId: String(context.lesson._id), lastVisitedLessonSlug: context.lesson.slug, lastVisitedAt: now };
  await StudentLearningProgressModel.updateOne(buildProgressOwnerFilter(clerkUserId), [{
    $set: {
      enrollments: {
        $concatArrays: [
          { $filter: { input: { $ifNull: ['$enrollments', []] }, as: 'enrollment', cond: { $ne: ['$$enrollment.pathSlug', context.path.slug] } } },
          [enrollment],
        ],
      },
    },
  }], { updatePipeline: true });
}

async function awardAchievementOnce(clerkUserId: string, key: LearningAchievementKey) {
  const achievement = ACHIEVEMENTS[key];
  const result = await StudentLearningProgressModel.updateOne(buildAchievementAwardFilter(clerkUserId, key), { $push: { achievements: { key, ...achievement, earnedAt: new Date() } }, $inc: { xp: achievement.xp } });
  return result.modifiedCount === 1;
}

export async function completeLesson(clerkUserId: string, context: { path: { _id: unknown; slug: string }; learningModule: LearningModule; lesson: LearningLesson }) {
  await ensureProgress(clerkUserId); const lessonId = String(context.lesson._id);
  const completion = await StudentLearningProgressModel.updateOne({ clerkUserId, 'completedLessons.lessonId': { $ne: lessonId } }, { $push: { completedLessons: { pathId: context.path._id, pathSlug: context.path.slug, moduleId: String(context.learningModule._id), lessonId, lessonSlug: context.lesson.slug, completedAt: new Date() } } });
  const awarded: LearningAchievementKey[] = [];
  if (completion.modifiedCount === 1) {
    if (await awardAchievementOnce(clerkUserId, 'first-lesson')) awarded.push('first-lesson');
    if (context.path.slug === 'python-zero-to-advanced' && await awardAchievementOnce(clerkUserId, 'python-explorer')) awarded.push('python-explorer');
  }
  const progress = await StudentLearningProgressModel.findOne(buildProgressOwnerFilter(clerkUserId)).lean();
  return { firstCompletion: completion.modifiedCount === 1, awarded, xp: progress?.xp ?? 0 };
}

export async function recordQuizAttempt(clerkUserId: string, context: { path: { _id: unknown; slug: string }; lesson: LearningLesson }, answers: number[]) {
  const result = scoreQuiz(context.lesson.quizQuestions, answers); await ensureProgress(clerkUserId); const lessonId = String(context.lesson._id); const now = new Date();
  await StudentLearningProgressModel.updateOne(buildProgressOwnerFilter(clerkUserId), { $push: { quizAttempts: { pathId: context.path._id, pathSlug: context.path.slug, lessonId, score: result.score, total: result.total, percentage: result.percentage, attemptedAt: now } } });
  const current = await StudentLearningProgressModel.findOne({ clerkUserId, quizBestScores: { $elemMatch: { lessonId } } }, { 'quizBestScores.$': 1 }).lean();
  const prior = current?.quizBestScores?.[0];
  if (!prior) await StudentLearningProgressModel.updateOne(buildProgressOwnerFilter(clerkUserId), { $push: { quizBestScores: { pathId: context.path._id, lessonId, score: result.score, total: result.total, percentage: result.percentage, updatedAt: now } } });
  else if (result.percentage > prior.percentage) await StudentLearningProgressModel.updateOne({ clerkUserId, 'quizBestScores.lessonId': lessonId }, { $set: { 'quizBestScores.$.score': result.score, 'quizBestScores.$.total': result.total, 'quizBestScores.$.percentage': result.percentage, 'quizBestScores.$.updatedAt': now } });
  const awarded = await awardAchievementOnce(clerkUserId, 'quiz-starter');
  const progress = await StudentLearningProgressModel.findOne(buildProgressOwnerFilter(clerkUserId)).lean();
  return { ...result, awarded: awarded ? ['quiz-starter' as const] : [], xp: progress?.xp ?? 0 };
}

export function publishedLessons(path: { modules: LearningModule[] }) {
  return path.modules.flatMap((learningModule) => learningModule.lessons.filter((lesson) => lesson.status === 'published').map((lesson) => ({ learningModule, lesson })));
}
