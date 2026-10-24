import { describe, expect, it } from 'vitest';
import { buildInsertOnlyChallengeUpdate, stage11Challenges } from './challenge-library.mjs';
import { validateChallengeLibrary } from './validate-challenge-library.mjs';

describe('Stage 11 coding challenge library', () => {
  it('contains fifteen unique new challenge definitions with required learning content', () => {
    expect(stage11Challenges).toHaveLength(15);
    expect(new Set(stage11Challenges.map((challenge) => challenge.slug)).size).toBe(15);
    for (const challenge of stage11Challenges) {
      expect(challenge.sampleTestCases.length).toBeGreaterThanOrEqual(3);
      expect(challenge.referenceSolutions.map((item) => item.language).sort()).toEqual(['javascript', 'python']);
      expect(challenge.explanation.length).toBeGreaterThan(30);
      expect(challenge.timeComplexity).toMatch(/^O\(/);
      expect(challenge.spaceComplexity).toMatch(/^O\(/);
      expect(challenge.trackSlugs.length).toBeGreaterThan(0);
    }
  });

  it('executes both reference languages against every public test contract', () => {
    const results = validateChallengeLibrary();
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.reduce((total, result) => total + result.testsPerLanguage * 2, 0)).toBe(90);
  });

  it('uses insert-only updates so reruns preserve existing challenge IDs and user work', () => {
    const update = buildInsertOnlyChallengeUpdate(stage11Challenges[0], true, new Date(0));
    expect(Object.keys(update)).toEqual(['$setOnInsert']);
    expect(update.$setOnInsert.status).toBe('published');
  });

  it('keeps a definition unpublished when validation did not pass', () => {
    const update = buildInsertOnlyChallengeUpdate(stage11Challenges[0], false, new Date(0));
    expect(update.$setOnInsert.status).toBe('draft');
    expect(update.$setOnInsert).not.toHaveProperty('publishedAt');
  });
});
