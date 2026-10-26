import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/db';
import { isTrackSectionUnlocked, recordTrackVisit, trackProgressOwner, trackVisitSchema } from '@/lib/practice-tracks';
import { PracticeTrackProgressModel } from '@/models/practice-track-progress.model';
import { PracticeTrackModel, PracticeTrackSectionModel } from '@/models/practice-track.model';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to save track progress.' }, { status: 401 });
  const parsed = trackVisitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid track visit.' }, { status: 400 });
  await connectToDatabase();
  const track = await PracticeTrackModel.findOne({ slug: parsed.data.trackSlug, status: 'published' }).select('_id slug').lean();
  if (!track) return NextResponse.json({ error: 'Track is unavailable.' }, { status: 404 });
  const sections = await PracticeTrackSectionModel.find({ trackId: track._id, status: 'published' }).select('_id slug quiz.id').sort({ order: 1 }).lean();
  const sectionIndex = sections.findIndex((section) => section.slug === parsed.data.sectionSlug);
  const section = sections[sectionIndex];
  if (!section) return NextResponse.json({ error: 'Section is unavailable.' }, { status: 404 });
  const progress = await PracticeTrackProgressModel.findOne(trackProgressOwner(userId, String(track._id))).select('completedQuizIds').lean();
  if (!isTrackSectionUnlocked(progress?.completedQuizIds ?? [], sections.map((item) => item.quiz.id), sectionIndex)) {
    return NextResponse.json({ error: 'Complete the earlier knowledge checks before opening this section.' }, { status: 409 });
  }
  await recordTrackVisit(userId, track, String(section._id));
  return NextResponse.json({ ok: true });
}
