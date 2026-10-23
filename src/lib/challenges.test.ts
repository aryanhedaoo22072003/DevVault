import { describe, expect, it } from 'vitest';
import { challengeOwnerFilter, parseTestCases, publishedChallengeFilter, slugifyChallenge } from '@/lib/challenges';

describe('coding challenge security', () => {
  it('limits public challenge queries to published records', () => expect(publishedChallengeFilter('two-sum')).toEqual({ slug: 'two-sum', status: 'published' }));
  it('scopes submission history to the authenticated Clerk user', () => expect(challengeOwnerFilter('user_owner')).toEqual({ clerkUserId: 'user_owner' }));
  it('creates stable safe slugs', () => expect(slugifyChallenge('  Valid Palindrome! ')).toBe('valid-palindrome'));
  it('validates test case JSON without executing content', () => {
    expect(parseTestCases('[{"input":"[1,2]","expectedOutput":"3"}]')).toHaveLength(1);
    expect(() => parseTestCases('{"input":"bad"}')).toThrow();
  });
});
