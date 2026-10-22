import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { buildAchievementAwardFilter, buildProgressOwnerFilter, calculateLearningProgress, findPublishedLesson, scoreQuiz } from '@/lib/learning-progress';

const questions = [
  { choices: ['print', 'echo', 'show'], answerIndex: 0, explanation: 'Python uses print().' },
  { choices: ['String', 'Integer'], answerIndex: 1, explanation: 'The value is an integer.' },
];

describe('student learning progress', () => {
  it('scopes progress records to the authenticated Clerk owner', () => {
    expect(buildProgressOwnerFilter('user_owner')).toEqual({ clerkUserId: 'user_owner' });
    expect(buildProgressOwnerFilter('user_owner')).not.toEqual(buildProgressOwnerFilter('user_other'));
  });
  it('scores answers from server-owned answer keys', () => {
    expect(scoreQuiz(questions, [0, 0])).toMatchObject({ score: 1, total: 2, percentage: 50 });
    expect(scoreQuiz(questions, [0, 1])).toMatchObject({ score: 2, total: 2, percentage: 100 });
  });
  it('rejects incomplete and out-of-range quiz answers', () => {
    expect(() => scoreQuiz(questions, [0])).toThrow('Answer every question');
    expect(() => scoreQuiz(questions, [0, 8])).toThrow('Invalid answer for question 2');
  });
  it('uses an atomic exclusion filter to prevent duplicate achievement XP', () => {
    expect(buildAchievementAwardFilter('user_owner', 'first-lesson')).toEqual({ clerkUserId: 'user_owner', 'achievements.key': { $ne: 'first-lesson' } });
  });
  it('calculates path and module progress from stable lesson IDs', () => {
    expect(calculateLearningProgress(['lesson-a', 'unrelated'], ['lesson-a', 'lesson-b'])).toEqual({ completed: 1, total: 2, percentage: 50 });
    expect(calculateLearningProgress([], [])).toEqual({ completed: 0, total: 0, percentage: 0 });
  });
  it('resolves the published Python lesson by its page slug or embedded MongoDB ID', () => {
    const publishedLesson = { _id: new mongoose.Types.ObjectId('6ad85767038f7737a35bd1a2'), title: 'Introduction to Python', slug: 'introduction-to-python', order: 0, markdown: '', codeExamples: [], flowcharts: [], quizQuestions: [], exercises: [], status: 'published' as const };
    const draftLesson = { ...publishedLesson, _id: new mongoose.Types.ObjectId(), slug: 'draft-python', status: 'draft' as const };
    const path = { modules: [{ _id: new mongoose.Types.ObjectId(), title: 'Python Foundations', slug: 'python-foundations', order: 0, lessons: [publishedLesson, draftLesson] }] };
    expect(String(findPublishedLesson(path, 'introduction-to-python')?.lesson._id)).toBe('6ad85767038f7737a35bd1a2');
    expect(findPublishedLesson(path, '6ad85767038f7737a35bd1a2')?.lesson.slug).toBe('introduction-to-python');
    expect(findPublishedLesson(path, 'draft-python')).toBeNull();
  });
});
