import { describe, expect, it } from 'vitest';
import { aggregateXp, buildDashboardActivities, nextUnfinishedItem, ownerFilter, uniqueKnowledgeChecks } from './student-dashboard';

describe('student dashboard projections', () => {
  it('uses the authoritative XP total without double-counting ledgers', () => {
    expect(aggregateXp({ xp: 200, achievements: [{ xp: 100 }], practiceQuizAwards: [{ xp: 25 }, { xp: 25 }], acceptedChallenges: [{ xp: 50 }] }))
      .toEqual({ total: 200, learning: 100, knowledgeChecks: 50, coding: 50, attributedTotal: 200, unattributedHistorical: 0 });
  });

  it('labels unexplained legacy XP as unattributed without inventing an award source', () => {
    const result = aggregateXp({ xp: 80, achievements: [{ xp: 50 }] });
    expect(result.knowledgeChecks).toBe(0);
    expect(result.attributedTotal).toBe(50);
    expect(result.unattributedHistorical).toBe(30);
  });

  it('counts completed knowledge checks once across track records', () => {
    expect(uniqueKnowledgeChecks([{ completedQuizIds: ['q1', 'q2'] }, { completedQuizIds: ['q2', 'q3'] }])).toBe(3);
    expect(uniqueKnowledgeChecks([{ completedQuizIds: ['q1', 'retired'] }], ['q1', 'q2'])).toBe(1);
  });

  it('selects the next unfinished item after the last visit and wraps safely', () => {
    const items = [{ id: 'a', slug: 'a', order: 1 }, { id: 'b', slug: 'b', order: 2 }, { id: 'c', slug: 'c', order: 3 }];
    expect(nextUnfinishedItem(items, ['a'], 'a')?.id).toBe('b');
    expect(nextUnfinishedItem(items, ['a', 'c'], 'c')?.id).toBe('b');
    expect(nextUnfinishedItem(items, ['a', 'b', 'c'], 'b')).toBeNull();
  });

  it('returns no recommendation for an empty new-user account', () => {
    expect(nextUnfinishedItem([], [], undefined)).toBeNull();
    expect(uniqueKnowledgeChecks([])).toBe(0);
    expect(aggregateXp(null).total).toBe(0);
  });

  it('sorts only real dated activity and does not invent missing events', () => {
    const activities = buildDashboardActivities([[{ key: 'old', kind: 'lesson', title: 'Old', description: '', href: '/', occurredAt: new Date('2025-01-01') }], [{ key: 'new', kind: 'draft', title: 'New', description: '', href: '/', occurredAt: new Date('2025-02-01') }]]);
    expect(activities.map((item) => item.key)).toEqual(['new', 'old']);
  });

  it('always scopes personalized queries to the authenticated owner', () => {
    expect(ownerFilter('user_a')).toEqual({ clerkUserId: 'user_a' });
    expect(ownerFilter('user_b')).not.toEqual(ownerFilter('user_a'));
  });
});
