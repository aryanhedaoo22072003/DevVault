import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getAuthorizedPublishedLesson, quizSubmissionSchema, recordQuizAttempt, recordLessonVisit } from '@/lib/learning-progress';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to submit quizzes and earn XP.' }, { status: 401 });
  const parsed = quizSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Submit one valid answer for every question.' }, { status: 400 });
  const context = await getAuthorizedPublishedLesson(parsed.data.pathSlug, parsed.data.lessonRef, userId);
  if (!context) return NextResponse.json({ error: 'Lesson is unavailable or you do not have access.' }, { status: 404 });
  try {
    await recordLessonVisit(userId, context);
    return NextResponse.json(await recordQuizAttempt(userId, context, parsed.data.answers));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to score quiz.' }, { status: 400 });
  }
}
