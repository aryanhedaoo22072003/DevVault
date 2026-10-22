import { z } from 'zod';

export const learningLessonDraftSchema = z.object({
  pathId: z.string().min(1), moduleId: z.string().min(1), lessonId: z.string().min(1),
  title: z.string().trim().min(3).max(160), markdown: z.string().max(100_000),
  codeExamples: z.array(z.object({ language: z.string().trim().max(40), code: z.string().max(30_000) })).max(12),
  flowcharts: z.array(z.object({ title: z.string().trim().max(160), definition: z.string().trim().max(20_000).refine((value) => value.split(/\s*->\s*/).filter(Boolean).length >= 2, 'Flowcharts require at least two nodes joined with ->.') })).max(8),
  quizQuestions: z.array(z.object({ prompt: z.string().trim().min(3).max(2_000), choices: z.array(z.string().trim().min(1).max(500)).min(2).max(8), answerIndex: z.number().int().min(0), explanation: z.string().trim().max(4_000) }).refine((quiz) => quiz.answerIndex < quiz.choices.length, 'Correct answer is outside the choice list.')).max(20),
  exercises: z.array(z.object({ title: z.string().trim().min(3).max(160), instructions: z.string().trim().min(3).max(10_000), expectedOutcomes: z.array(z.string().trim().min(1).max(500)).max(12), starterCode: z.string().max(30_000), language: z.string().trim().max(40) })).max(12),
});

export function buildPaidLearningAccessFilter(userId: string, productId: string) {
  return { clerkUserId: userId, userId, paymentStatus: 'paid' as const, 'items.productId': productId };
}

export function publishedLearningPathFilter(slug: string) { return { slug, status: 'published' as const }; }

export function reorderTarget(length: number, index: number, direction: 'up' | 'down') {
  const target = direction === 'up' ? index - 1 : index + 1;
  return index < 0 || target < 0 || target >= length ? null : target;
}

export function quizFeedback(selectedIndex: number, answerIndex: number) { return selectedIndex === answerIndex ? 'correct' as const : 'incorrect' as const; }

export function canOpenLearningPath(access: string, userId: string | null, ownsPaidProduct: boolean) {
  if (access === 'public') return true;
  if (access === 'authenticated') return Boolean(userId);
  if (access === 'paid') return Boolean(userId && ownsPaidProduct);
  return false;
}
