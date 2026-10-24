import { describe, expect, it } from 'vitest';
import { challengeOwnerFilter, parseTestCases, publishedChallengeFilter, slugifyChallenge } from '@/lib/challenges';
import { CodingChallengeModel } from '@/models/coding-challenge.model';

describe('coding challenge security', () => {
  it('limits public challenge queries to published records', () => expect(publishedChallengeFilter('two-sum')).toEqual({ slug: 'two-sum', status: 'published' }));
  it('scopes submission history to the authenticated Clerk user', () => expect(challengeOwnerFilter('user_owner')).toEqual({ clerkUserId: 'user_owner' }));
  it('creates stable safe slugs', () => expect(slugifyChallenge('  Valid Palindrome! ')).toBe('valid-palindrome'));
  it('validates test case JSON without executing content', () => {
    expect(parseTestCases('[{"input":"[1,2]","expectedOutput":"3"}]')).toHaveLength(1);
    expect(() => parseTestCases('{"input":"bad"}')).toThrow();
  });
  it('keeps private tests and internal reference solutions out of normal queries', () => {
    expect(CodingChallengeModel.schema.path('privateTestCases').options.select).toBe(false);
    expect(CodingChallengeModel.schema.path('referenceSolutions').options.select).toBe(false);
  });
});
