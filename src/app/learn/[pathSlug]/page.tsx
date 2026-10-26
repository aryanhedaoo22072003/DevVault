import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { HighlightedCode, SafeFlowchart, SafeMarkdown } from '@/components/learning-content';
import { LessonQuiz } from '@/components/lesson-quiz';
import { LessonProgressControl } from '@/components/lesson-progress-control';
import { Navbar } from '@/components/navbar';
import { connectToDatabase } from '@/lib/db';
import { hasClerkConfig } from '@/lib/env';
import { LearningPathModel } from '@/models/learning-content.model';
import { OrderModel } from '@/models/order.model';
import { buildPaidLearningAccessFilter, publishedLearningPathFilter } from '@/lib/learning';
import { calculateLearningProgress } from '@/lib/learning-progress';
import { StudentLearningProgressModel } from '@/models/learning-progress.model';
import { subjectColor } from '@/lib/subject-colors';
import type { CSSProperties } from 'react';

export default async function LearningPathPage({ params, searchParams }: { params: Promise<{ pathSlug: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { pathSlug } = await params; const { lesson: requestedLesson } = await searchParams; await connectToDatabase();
  const path = await LearningPathModel.findOne(publishedLearningPathFilter(pathSlug)).lean(); if (!path) notFound();
  const userId = hasClerkConfig ? (await auth()).userId : null;
  if (path.access === 'authenticated' && !userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/learn/${pathSlug}`)}`);
  if (path.access === 'paid') {
    if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/learn/${pathSlug}`)}`);
    const ownsProduct = path.productId && await OrderModel.exists(buildPaidLearningAccessFilter(userId, path.productId));
    if (!ownsProduct) notFound();
  }
  const progress = userId ? await StudentLearningProgressModel.findOne({ clerkUserId: userId }).lean() : null;
  const completedIds = new Set(progress?.completedLessons.map((entry) => entry.lessonId) ?? []);
  const orderedModules = [...path.modules].sort((left, right) => left.order - right.order);
  const lessons = orderedModules.flatMap((module) => [...module.lessons]
    .filter((lesson) => lesson.status === 'published')
    .sort((left, right) => left.order - right.order)
    .map((lesson) => ({ ...lesson, moduleId: String(module._id), moduleTitle: module.title })));
  if (!lessons.length) notFound(); const active = lessons.find((lesson) => lesson.slug === requestedLesson) ?? lessons[0];
  const activeIndex = lessons.findIndex((lesson) => lesson.slug === active.slug);
  const previousLesson = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const nextLesson = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;
  const pathProgress = calculateLearningProgress(completedIds, lessons.map((lesson) => String(lesson._id)));
  const resume = progress?.enrollments.find((entry) => String(entry.pathId) === String(path._id));
  return <main className="learning-subject min-h-screen bg-slate-950 text-slate-100" style={{'--subject-color':subjectColor(path.subject)} as CSSProperties}><Navbar /><div className="section-shell py-8">
    <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">{path.subject}</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold text-white">{path.title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">{path.description}</p></div>{resume ? <Link href={`/learn/${path.slug}?lesson=${encodeURIComponent(resume.lastVisitedLessonSlug)}`} className="rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-100">Resume Learning</Link> : null}</div><div className="mt-5 max-w-xl"><div className="mb-2 flex justify-between text-xs text-slate-400"><span>Path progress</span><span>{pathProgress.completed}/{pathProgress.total} lessons · {pathProgress.percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-400 transition-all" style={{ width: `${pathProgress.percentage}%` }} /></div></div></div>
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-3xl border border-white/10 bg-slate-900/60 p-3 lg:sticky lg:top-28"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Lessons</p>{orderedModules.map((learningModule) => { const moduleLessons = lessons.filter((lesson) => lesson.moduleId === String(learningModule._id)); if (!moduleLessons.length) return null; const moduleProgress = calculateLearningProgress(completedIds, moduleLessons.map((lesson) => String(lesson._id))); return <div key={String(learningModule._id)} className="mb-3"><div className="px-3 pb-1 pt-2"><div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500"><span>{learningModule.title}</span><span>{moduleProgress.percentage}%</span></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-violet-400" style={{ width: `${moduleProgress.percentage}%` }} /></div></div>{moduleLessons.map((lesson) => <Link key={String(lesson._id)} aria-current={lesson.slug === active.slug ? 'page' : undefined} href={`/learn/${path.slug}?lesson=${encodeURIComponent(lesson.slug)}`} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${lesson.slug === active.slug ? 'bg-violet-400/10 text-violet-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><span>{lesson.title}</span>{completedIds.has(String(lesson._id)) ? <span className="text-emerald-300" aria-label="Completed">✓</span> : null}</Link>)}</div>; })}</aside>
      <article className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-8"><p className="text-xs uppercase tracking-wider text-violet-300">{active.moduleTitle}</p><h2 className="mt-2 text-3xl font-semibold text-white">{active.title}</h2><div className="mt-8"><SafeMarkdown source={active.markdown} /></div>
        {active.codeExamples.length ? <div className="mt-8 space-y-4">{active.codeExamples.map((example, index) => <HighlightedCode key={index} {...example} />)}</div> : null}
        {active.flowcharts.length ? <div className="mt-8 space-y-5 rounded-2xl border border-white/10 p-5">{active.flowcharts.map((flow, index) => <SafeFlowchart key={index} {...flow} />)}</div> : null}
        {active.quizQuestions.length ? <div className="mt-8"><LessonQuiz pathSlug={path.slug} lessonRef={active.slug} questions={active.quizQuestions.map((question) => ({ prompt: question.prompt, choices: question.choices }))} /></div> : null}
        {active.exercises.length ? <div className="mt-8 space-y-4"><h3 className="text-xl font-semibold text-white">Practice</h3>{active.exercises.map((exercise, index) => <section key={index} className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-5"><h4 className="font-semibold text-white">{exercise.title}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{exercise.instructions}</p>{exercise.expectedOutcomes?.length ? <><p className="mt-4 text-xs uppercase tracking-wider text-slate-500">Expected outcomes</p><ul className="mt-2 space-y-1 text-sm text-slate-300">{exercise.expectedOutcomes.map((outcome) => <li key={outcome}>• {outcome}</li>)}</ul></> : null}</section>)}</div> : null}
        <LessonProgressControl pathSlug={path.slug} lessonRef={active.slug} signedIn={Boolean(userId)} initiallyCompleted={completedIds.has(String(active._id))} />
        <nav aria-label="Lesson navigation" className="mt-6 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
          {previousLesson ? <Link rel="prev" href={`/learn/${path.slug}?lesson=${encodeURIComponent(previousLesson.slug)}`} className="rounded-2xl border border-white/10 p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-400/5"><span className="block text-xs uppercase tracking-wider text-slate-500">Previous lesson</span><span className="mt-1 block font-medium text-slate-200">{previousLesson.title}</span></Link> : <span />}
          {nextLesson ? <Link rel="next" href={`/learn/${path.slug}?lesson=${encodeURIComponent(nextLesson.slug)}`} className="rounded-2xl border border-white/10 p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-400/5 sm:text-right"><span className="block text-xs uppercase tracking-wider text-slate-500">Next lesson</span><span className="mt-1 block font-medium text-slate-200">{nextLesson.title}</span></Link> : null}
        </nav>
      </article>
    </div>
  </div></main>;
}
