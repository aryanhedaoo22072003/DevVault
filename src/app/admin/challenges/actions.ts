'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminAccess } from '@/lib/auth';
import { challengeFormSchema, parseTestCases, slugifyChallenge } from '@/lib/challenges';
import { connectToDatabase } from '@/lib/db';
import { CodingChallengeModel, type ChallengeStatus } from '@/models/coding-challenge.model';

const idSchema = z.string().refine(mongoose.isValidObjectId, 'Invalid challenge identifier.');
const examplesSchema = z.array(z.object({ input: z.string().max(4_000), output: z.string().max(4_000), explanation: z.string().max(8_000).optional().default('') })).max(20);
function values(formData: FormData) {
  const parsed = challengeFormSchema.parse(Object.fromEntries(formData));
  const starterCode = [
    ...(parsed.pythonStarter.trim() ? [{ language: 'python' as const, code: parsed.pythonStarter }] : []),
    ...(parsed.javascriptStarter.trim() ? [{ language: 'javascript' as const, code: parsed.javascriptStarter }] : []),
  ];
  if (!starterCode.length) throw new Error('Add starter code for at least one language.');
  return { title: parsed.title, summary: parsed.summary, statement: parsed.statement, difficulty: parsed.difficulty, topic: parsed.topic, entrypoint: parsed.entrypoint || slugifyChallenge(parsed.title).replaceAll('-', '_'),
    tags: parsed.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 12),
    explanation: parsed.explanation,
    timeComplexity: parsed.timeComplexity,
    spaceComplexity: parsed.spaceComplexity,
    trackSlugs: parsed.trackSlugs.split(',').map((slug) => slug.trim().toLowerCase()).filter(Boolean).slice(0, 10),
    supportedLanguages: starterCode.map((entry) => entry.language), starterCode,
    examples: examplesSchema.parse(JSON.parse(parsed.examples || '[]')), constraints: parsed.constraints.split('\n').map((item) => item.trim()).filter(Boolean),
    sampleTestCases: parseTestCases(parsed.sampleTestCases), privateTestCases: parseTestCases(parsed.privateTestCases) };
}
function refresh(slug?: string) { revalidatePath('/admin/challenges'); revalidatePath('/practice'); if (slug) revalidatePath(`/practice/${slug}`); }

export async function createChallengeAction(formData: FormData) {
  await requireAdminAccess(); const data = values(formData); await connectToDatabase(); const slug = slugifyChallenge(data.title);
  if (!slug || await CodingChallengeModel.exists({ slug })) throw new Error('A challenge with this title already exists.');
  await CodingChallengeModel.create({ ...data, slug, status: 'draft' }); refresh(slug);
}

export async function updateChallengeAction(challengeId: string, formData: FormData) {
  await requireAdminAccess(); idSchema.parse(challengeId); const data = values(formData); await connectToDatabase();
  const challenge = await CodingChallengeModel.findById(challengeId).select('+privateTestCases'); if (!challenge) throw new Error('Challenge not found.');
  Object.assign(challenge, data); await challenge.save(); refresh(challenge.slug);
}

export async function setChallengeStatusAction(challengeId: string, nextStatus: ChallengeStatus) {
  await requireAdminAccess(); idSchema.parse(challengeId); z.enum(['draft', 'published', 'archived']).parse(nextStatus); await connectToDatabase();
  const challenge = await CodingChallengeModel.findById(challengeId); if (!challenge) throw new Error('Challenge not found.');
  if (nextStatus === 'published' && (!challenge.statement.trim() || !challenge.starterCode.length || !challenge.sampleTestCases.length)) throw new Error('Published challenges require a statement, starter code, and sample tests.');
  challenge.status = nextStatus; challenge.publishedAt = nextStatus === 'published' ? (challenge.publishedAt ?? new Date()) : undefined; await challenge.save(); refresh(challenge.slug);
}
