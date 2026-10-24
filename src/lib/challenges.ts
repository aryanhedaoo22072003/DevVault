import { z } from 'zod';

export const challengeLanguages = ['python', 'javascript'] as const;
export const challengeDifficulties = ['easy', 'medium', 'hard'] as const;
export const publishedChallengeFilter = (slug?: string) => ({ ...(slug ? { slug } : {}), status: 'published' as const });
export const challengeOwnerFilter = (clerkUserId: string) => ({ clerkUserId });
export const slugifyChallenge = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

const testCasesSchema = z.array(z.object({ input: z.string().max(4_000), expectedOutput: z.string().max(4_000) })).max(50);
export function parseTestCases(value: string) {
  if (!value.trim()) return [];
  return testCasesSchema.parse(JSON.parse(value));
}

export const challengeFormSchema = z.object({
  title: z.string().trim().min(3).max(160), summary: z.string().trim().min(10).max(500),
  statement: z.string().trim().min(20).max(30_000), difficulty: z.enum(challengeDifficulties),
  topic: z.string().trim().min(2).max(100), tags: z.string().max(500),
  explanation: z.string().max(30_000).optional().default(''),
  timeComplexity: z.string().max(500).optional().default(''),
  spaceComplexity: z.string().max(500).optional().default(''),
  trackSlugs: z.string().max(500).optional().default(''),
  entrypoint: z.string().trim().regex(/^[A-Za-z_$][A-Za-z0-9_$]{0,99}$/).optional().default(''),
  pythonStarter: z.string().max(30_000), javascriptStarter: z.string().max(30_000),
  examples: z.string().max(30_000), constraints: z.string().max(10_000), sampleTestCases: z.string().max(30_000), privateTestCases: z.string().max(100_000),
});
