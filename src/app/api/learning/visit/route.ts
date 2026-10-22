import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getAuthorizedPublishedLesson, lessonProgressSchema, recordLessonVisit } from '@/lib/learning-progress';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to save learning progress.' }, { status: 401 });
  const parsed = lessonProgressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid lesson progress request.' }, { status: 400 });
  const context = await getAuthorizedPublishedLesson(parsed.data.pathSlug, parsed.data.lessonRef, userId);
  if (!context) return NextResponse.json({ error: 'Lesson is unavailable or you do not have access.' }, { status: 404 });
  try {
    await recordLessonVisit(userId, context);
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to save learning progress.', ...(process.env.NODE_ENV === 'development' ? { diagnostic: error instanceof Error ? error.message : 'Unknown progress error' } : {}) }, { status: 500 });
  }
}
