import { z } from 'zod';

export type PracticeProgress = 'not-started' | 'in-progress' | 'solved';
export const practiceStateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('view') }),
  z.object({ action: z.literal('bookmark'), bookmarked: z.boolean() }),
  z.object({ action: z.literal('draft'), language: z.enum(['python', 'javascript']), code: z.string().max(30_000) }),
  z.object({ action: z.literal('reset'), language: z.enum(['python', 'javascript']) }),
]);

export function practiceProgress(input: { solved: boolean; viewed: boolean; hasDraft: boolean }): PracticeProgress {
  if (input.solved) return 'solved';
  if (input.viewed || input.hasDraft) return 'in-progress';
  return 'not-started';
}

export function practiceSummary(rows: Array<{ progress: PracticeProgress; bookmarked: boolean }>, total: number) {
  return { total, attempted: rows.filter((row) => row.progress !== 'not-started').length, solved: rows.filter((row) => row.progress === 'solved').length, bookmarked: rows.filter((row) => row.bookmarked).length };
}

export function practiceOwnerFilter(clerkUserId: string, challengeId: string) { return { clerkUserId, challengeId }; }
