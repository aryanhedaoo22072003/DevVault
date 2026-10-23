import { describe, expect, it } from 'vitest';
import { practiceOwnerFilter, practiceProgress, practiceStateSchema, practiceSummary } from './practice';
import { ChallengePracticeModel } from '@/models/challenge-practice.model';

describe('practice state', () => {
  it('validates autosaves and rejects oversized drafts', () => { expect(practiceStateSchema.safeParse({ action: 'draft', language: 'python', code: 'print(1)' }).success).toBe(true); expect(practiceStateSchema.safeParse({ action: 'draft', language: 'python', code: 'x'.repeat(30_001) }).success).toBe(false); });
  it('scopes writes to the authenticated owner', () => { expect(practiceOwnerFilter('user_a','challenge_a')).toEqual({ clerkUserId: 'user_a', challengeId: 'challenge_a' }); });
  it('never treats a draft as solved', () => { expect(practiceProgress({ solved: false, viewed: false, hasDraft: true })).toBe('in-progress'); expect(practiceProgress({ solved: true, viewed: false, hasDraft: false })).toBe('solved'); });
  it('calculates summary without fabricating solves', () => { expect(practiceSummary([{ progress:'not-started',bookmarked:false },{ progress:'in-progress',bookmarked:true },{ progress:'solved',bookmarked:false }],3)).toEqual({ total:3,attempted:2,solved:1,bookmarked:1 }); });
  it('models idempotent bookmark state as a boolean', () => { expect(practiceStateSchema.parse({ action:'bookmark',bookmarked:true })).toEqual({ action:'bookmark',bookmarked:true }); });
  it('prevents duplicate user/challenge records with a unique index', () => { const index=ChallengePracticeModel.schema.indexes().find(([fields])=>fields.clerkUserId===1&&fields.challengeId===1); expect(index?.[1]?.unique).toBe(true); });
});
