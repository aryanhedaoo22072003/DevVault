import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { practiceOwnerFilter, practiceStateSchema } from '@/lib/practice';
import { ChallengePracticeModel } from '@/models/challenge-practice.model';
import { CodingChallengeModel } from '@/models/coding-challenge.model';

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to save practice activity.' }, { status: 401 });
  const parsed = practiceStateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid practice update.' }, { status: 400 });
  const { slug } = await params; await connectToDatabase();
  const challenge = await CodingChallengeModel.findOne({ slug, status: 'published' }).select('_id slug supportedLanguages').lean();
  if (!challenge) return NextResponse.json({ error: 'Challenge is unavailable.' }, { status: 404 });
  if ('language' in parsed.data && !challenge.supportedLanguages.includes(parsed.data.language)) return NextResponse.json({ error: 'Language is not supported.' }, { status: 400 });
  const filter = practiceOwnerFilter(userId, String(challenge._id)); const now = new Date();
  const base = { $setOnInsert: { clerkUserId: userId, challengeId: challenge._id, challengeSlug: challenge.slug } };
  if (parsed.data.action === 'view') await ChallengePracticeModel.updateOne(filter, { ...base, $max: { viewedAt: now } }, { upsert: true, setDefaultsOnInsert: true });
  if (parsed.data.action === 'bookmark') await ChallengePracticeModel.updateOne(filter, { ...base, $set: { bookmarked: parsed.data.bookmarked } }, { upsert: true, setDefaultsOnInsert: true });
  if (parsed.data.action === 'draft') await ChallengePracticeModel.updateOne(filter, { ...base, $set: { [`drafts.${parsed.data.language}`]: { code: parsed.data.code, updatedAt: now } }, $addToSet: { draftStartedLanguages: parsed.data.language } }, { upsert: true, setDefaultsOnInsert: true });
  if (parsed.data.action === 'reset') await ChallengePracticeModel.updateOne(filter, { ...base, $unset: { [`drafts.${parsed.data.language}`]: 1 }, $pull: { draftStartedLanguages: parsed.data.language } }, { upsert: true, setDefaultsOnInsert: true });
  return NextResponse.json({ ok: true });
}
