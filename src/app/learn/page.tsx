import { auth } from '@clerk/nextjs/server';
import { ArrowRight, BookOpen, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

import { Navbar } from '@/components/navbar';
import { connectToDatabase } from '@/lib/db';
import { calculateLearningProgress } from '@/lib/learning-progress';
import { subjectColor } from '@/lib/subject-colors';
import { LearningPathModel } from '@/models/learning-content.model';
import { StudentLearningProgressModel } from '@/models/learning-progress.model';

export default async function LearningCatalogPage() {
  const { userId } = await auth();
  await connectToDatabase();
  const [paths, progress] = await Promise.all([
    LearningPathModel.find({ status: 'published' }).sort({ createdAt: 1, title: 1 }).lean(),
    userId ? StudentLearningProgressModel.findOne({ clerkUserId: userId }).lean() : null,
  ]);
  const completed = new Set(progress?.completedLessons.map((item) => item.lessonId) ?? []);
  const enrollmentByPath = new Map((progress?.enrollments ?? []).map((item) => [String(item.pathId), item]));

  return <main className="min-h-screen bg-slate-950 text-slate-100"><Navbar/><div className="section-shell py-10 md:py-16">
    <header className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">Learning library</p><h1 className="mt-3 text-4xl font-semibold text-white md:text-6xl">Build durable engineering foundations.</h1><p className="mt-5 text-base leading-7 text-slate-400">Explore the published DevVault curriculum. Course access and saved progress are always resolved on the server.</p></header>
    {paths.length ? <section className="mt-10 grid gap-5 lg:grid-cols-2">{paths.map((path) => {
      const lessons = path.modules.flatMap((module) => module.lessons.filter((lesson) => lesson.status === 'published'));
      const result = calculateLearningProgress(completed, lessons.map((lesson) => String(lesson._id)));
      const enrollment = enrollmentByPath.get(String(path._id));
      const href = `/learn/${path.slug}${enrollment?.lastVisitedLessonSlug ? `?lesson=${encodeURIComponent(enrollment.lastVisitedLessonSlug)}` : ''}`;
      const color=subjectColor(path.subject);
      return <article key={String(path._id)} className="aurora-card flex flex-col overflow-hidden rounded-3xl border-t-4 p-6 md:p-8" style={{borderTopColor:color}}><div className="flex items-center justify-between gap-3"><span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{color,borderColor:`color-mix(in srgb, ${color} 45%, var(--border))`,background:`color-mix(in srgb, ${color} 10%, transparent)`}}>{path.subject}</span>{path.access !== 'public' ? <span className="inline-flex items-center gap-1 text-xs text-amber-200"><LockKeyhole className="h-3.5 w-3.5"/>{path.access === 'paid' ? 'Purchase required' : 'Sign-in required'}</span> : <span className="text-xs text-emerald-300">Public</span>}</div><h2 className="mt-5 text-2xl font-semibold text-white">{path.title}</h2><p className="mt-3 flex-1 text-sm leading-7 text-slate-400">{path.description}</p><div className="mt-6 flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2 text-slate-300"><BookOpen className="h-4 w-4" style={{color}}/>{lessons.length} lessons</span>{userId ? <span style={{color}}>{result.percentage}% complete</span> : null}</div>{userId ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${path.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.percentage}><div className="h-full rounded-full" style={{width:`${result.percentage}%`,backgroundColor:color}}/></div> : null}<Link href={href} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">{enrollment ? 'Continue course' : 'Explore course'}<ArrowRight className="h-4 w-4"/></Link></article>;
    })}</section> : <section className="aurora-card mt-10 rounded-3xl p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-violet-300"/><h2 className="mt-4 text-xl font-semibold text-white">No published courses</h2><p className="mt-2 text-slate-400">Published learning paths will appear here when they are available.</p></section>}
  </div></main>;
}
