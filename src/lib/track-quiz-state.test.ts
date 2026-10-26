import { describe, expect, it } from 'vitest';

import { orderedQuizAnswers, quizIdentity } from './track-quiz-state';

describe('track quiz client state', () => {
  it('uses a section-specific identity', () => {
    expect(quizIdentity('track', 'section-a', 'quiz-a')).not.toBe(quizIdentity('track', 'section-b', 'quiz-b'));
  });

  it('serializes multiple current-section answers in question order', () => {
    expect(orderedQuizAnswers(['q1', 'q2'], { q2: 0, q1: 2 })).toEqual([2, 0]);
  });

  it('does not let answers from another section satisfy validation', () => {
    expect(() => orderedQuizAnswers(['new-q1'], { 'old-q1': 0 })).toThrow(/every question in this section/i);
  });

  it('rejects empty quizzes, missing answers, and duplicate question ids', () => {
    expect(() => orderedQuizAnswers([], {})).toThrow(/invalid question identifiers/i);
    expect(() => orderedQuizAnswers(['q1', 'q2'], { q1: 0 })).toThrow(/every question/i);
    expect(() => orderedQuizAnswers(['q1', 'q1'], { q1: 0 })).toThrow(/invalid question identifiers/i);
  });
});
