export type DashboardActivity = {
  key: string;
  kind: 'knowledge-check' | 'lesson' | 'badge' | 'draft' | 'track-visit' | 'challenge';
  title: string;
  description: string;
  href: string;
  occurredAt: Date;
};

type OrderedItem = { id: string; slug: string; order: number };

export function nextUnfinishedItem(items: OrderedItem[], completedIds: Iterable<string>, lastId?: string) {
  const ordered = [...items].sort((a, b) => a.order - b.order);
  const completed = new Set(completedIds);
  if (!ordered.length || ordered.every((item) => completed.has(item.id))) return null;
  const lastIndex = lastId ? ordered.findIndex((item) => item.id === lastId) : -1;
  const searchOrder = lastIndex >= 0 ? [...ordered.slice(lastIndex + 1), ...ordered.slice(0, lastIndex + 1)] : ordered;
  return searchOrder.find((item) => !completed.has(item.id)) ?? null;
}

export function aggregateXp(progress?: {
  xp?: number;
  achievements?: Array<{ xp: number }>;
  practiceQuizAwards?: Array<{ xp: number }>;
  acceptedChallenges?: Array<{ xp: number }>;
} | null) {
  const learning = (progress?.achievements ?? []).reduce((sum, item) => sum + item.xp, 0);
  const knowledgeChecks = (progress?.practiceQuizAwards ?? []).reduce((sum, item) => sum + item.xp, 0);
  const coding = (progress?.acceptedChallenges ?? []).reduce((sum, item) => sum + item.xp, 0);
  const total = progress?.xp ?? 0;
  const attributedTotal = learning + knowledgeChecks + coding;
  return {
    total,
    learning,
    knowledgeChecks,
    coding,
    attributedTotal,
    unattributedHistorical: Math.max(0, total - attributedTotal),
  };
}

export function uniqueKnowledgeChecks(progresses: Array<{ completedQuizIds?: string[] }>, publishedQuizIds?: Iterable<string>) {
  const allowed = publishedQuizIds ? new Set(publishedQuizIds) : null;
  return new Set(progresses.flatMap((progress) => progress.completedQuizIds ?? []).filter((quizId) => !allowed || allowed.has(quizId))).size;
}

export function buildDashboardActivities(groups: DashboardActivity[][], limit = 10) {
  return groups.flat().filter((activity) => Number.isFinite(activity.occurredAt.getTime()))
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, limit);
}

export function ownerFilter(clerkUserId: string) {
  return { clerkUserId };
}

