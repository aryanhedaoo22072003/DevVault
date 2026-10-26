import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
const getAuthorizedPublishedLesson = vi.fn();
const recordLessonVisit = vi.fn();
const recordQuizAttempt = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({ auth }));
vi.mock('@/lib/learning-progress', () => ({
  quizSubmissionSchema: {
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
  getAuthorizedPublishedLesson,
  recordLessonVisit,
  recordQuizAttempt,
}));

describe('learning quiz authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an anonymous quiz submission before lesson lookup', async () => {
    auth.mockResolvedValue({ userId: null });
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/learning/quiz', { method: 'POST', body: '{}' }));

    expect(response.status).toBe(401);
    expect(getAuthorizedPublishedLesson).not.toHaveBeenCalled();
  });

  it('uses the authenticated Clerk identity for grading and persistence', async () => {
    auth.mockResolvedValue({ userId: 'user_student12345' });
    const lesson = { pathId: 'path', lessonId: 'lesson', quiz: { questions: [] } };
    getAuthorizedPublishedLesson.mockResolvedValue(lesson);
    recordQuizAttempt.mockResolvedValue({ score: 1, total: 1, passed: true, xpAwarded: 0 });
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/learning/quiz', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pathSlug: 'python-zero-to-advanced', lessonRef: 'introduction-to-python', answers: [0] }),
    }));

    expect(response.status).toBe(200);
    expect(getAuthorizedPublishedLesson).toHaveBeenCalledWith('python-zero-to-advanced', 'introduction-to-python', 'user_student12345');
    expect(recordLessonVisit).toHaveBeenCalledWith('user_student12345', lesson);
    expect(recordQuizAttempt).toHaveBeenCalledWith('user_student12345', lesson, [0]);
  });
});
