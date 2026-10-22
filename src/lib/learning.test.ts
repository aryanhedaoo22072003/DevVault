import { describe, expect, it } from 'vitest';
import { parseSafeFlowchart } from '@/components/learning-content';
import { buildPaidLearningAccessFilter, canOpenLearningPath, learningLessonDraftSchema, publishedLearningPathFilter, quizFeedback, reorderTarget } from '@/lib/learning';

describe('learning content security', () => {
  it('sanitizes the constrained flowchart grammar and limits nodes', () => {
    expect(parseSafeFlowchart('Request -> <script>alert(1)</script> -> Respond')).toEqual(['Request', 'scriptalert1script', 'Respond']);
    expect(parseSafeFlowchart(Array.from({ length: 20 }, (_, index) => `N${index}`).join(' -> '))).toHaveLength(12);
  });
  it('enforces public, authenticated, and paid access states', () => {
    expect(canOpenLearningPath('public', null, false)).toBe(true);
    expect(canOpenLearningPath('authenticated', null, false)).toBe(false);
    expect(canOpenLearningPath('authenticated', 'user_1', false)).toBe(true);
    expect(canOpenLearningPath('paid', 'user_1', false)).toBe(false);
    expect(canOpenLearningPath('paid', 'user_1', true)).toBe(true);
  });
  it('requires both Clerk identifiers, paid state, and product snapshot for access', () => {
    expect(buildPaidLearningAccessFilter('user_1', 'product_1')).toEqual({ clerkUserId: 'user_1', userId: 'user_1', paymentStatus: 'paid', 'items.productId': 'product_1' });
  });
  it('validates autosave drafts and rejects malformed quizzes', () => {
    const base = { pathId: 'path', moduleId: 'module', lessonId: 'lesson', title: 'Introduction', markdown: '# Notes', codeExamples: [], flowcharts: [], exercises: [] };
    expect(learningLessonDraftSchema.safeParse({ ...base, quizQuestions: [{ prompt: 'Valid?', choices: ['Yes', 'No'], answerIndex: 0, explanation: 'Because.' }] }).success).toBe(true);
    expect(learningLessonDraftSchema.safeParse({ ...base, quizQuestions: [{ prompt: 'Invalid?', choices: ['Only'], answerIndex: 4, explanation: '' }] }).success).toBe(false);
  });
  it('calculates bounded lesson reordering', () => {
    expect(reorderTarget(3, 1, 'up')).toBe(0); expect(reorderTarget(3, 1, 'down')).toBe(2); expect(reorderTarget(3, 0, 'up')).toBeNull();
  });
  it('limits student queries to published paths and evaluates quiz choices', () => {
    expect(publishedLearningPathFilter('python-zero-to-advanced')).toEqual({ slug: 'python-zero-to-advanced', status: 'published' });
    expect(quizFeedback(1, 1)).toBe('correct'); expect(quizFeedback(0, 1)).toBe('incorrect');
  });
});
