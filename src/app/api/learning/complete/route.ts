import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { completeLesson, getAuthorizedPublishedLesson, lessonProgressSchema, recordLessonVisit } from '@/lib/learning-progress';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to complete lessons and earn XP.' }, { status: 401 });
  const parsed = lessonProgressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid lesson completion request.' }, { status: 400 });
  const context = await getAuthorizedPublishedLesson(parsed.data.pathSlug, parsed.data.lessonRef, userId);
  if (!context) return NextResponse.json({ error: 'Lesson is unavailable or you do not have access.' }, { status: 404 });
  await recordLessonVisit(userId, context);
  return NextResponse.json(await completeLesson(userId, context));
}
