import Link from 'next/link';

import { AdminHeader, EmptyState } from '@/components/admin-ui';
import { LearningWorkspace } from '@/components/learning-workspace';
import { connectToDatabase } from '@/lib/db';
import { LearningPathModel } from '@/models/learning-content.model';
import { createLearningPathAction, type LearningWorkspaceData } from './actions';

export default async function AdminLearningPage() {
  await connectToDatabase(); const documents = await LearningPathModel.find({}).sort({ updatedAt: -1 }).limit(30).lean();
  const paths: LearningWorkspaceData = documents.map((path) => ({ id: String(path._id), title: path.title, slug: path.slug, subject: path.subject, description: path.description, status: path.status, access: path.access ?? 'public', modules: [...path.modules].sort((a,b) => a.order-b.order).map((module) => ({ id: String(module._id), title: module.title, lessons: [...module.lessons].sort((a,b) => a.order-b.order).map((lesson) => ({ id: String(lesson._id), title: lesson.title, slug: lesson.slug, status: lesson.status, markdown: lesson.markdown, codeExamples: lesson.codeExamples ?? [], flowcharts: lesson.flowcharts ?? [], quizQuestions: lesson.quizQuestions ?? [], exercises: (lesson.exercises ?? []).map((exercise) => ({ ...exercise, expectedOutcomes: exercise.expectedOutcomes ?? [] })) })) })) }));
  return <><AdminHeader eyebrow="Interactive notes studio" title="Learning Workspace" description="Author safe Markdown lessons, highlighted examples, linear flow diagrams, quizzes, and exercises. Drafts autosave; publishing is always explicit." action={paths.find((path) => path.status === 'published') ? <Link href={`/learn/${paths.find((path) => path.status === 'published')!.slug}`} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">Open student preview</Link> : undefined} />
    <details className="mb-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5"><summary className="cursor-pointer text-sm font-semibold text-white">Create learning path</summary><form action={createLearningPathAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><input name="title" required minLength={3} placeholder="Path title" className="admin-input" /><input name="subject" required placeholder="Subject" className="admin-input" /><input name="description" placeholder="Short description" className="admin-input xl:col-span-2" /><select name="access" className="admin-input"><option value="public">Public preview</option><option value="authenticated">Signed-in users</option><option value="paid">Paid product owners</option></select><input name="productId" placeholder="Product ID (paid only)" className="admin-input" /><button className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Create draft path</button></form></details>
    {paths.length ? <LearningWorkspace key={documents.map((item) => String(item.updatedAt)).join(':')} paths={paths} /> : <EmptyState title="No learning paths yet" message="Create one draft path above. DevVault does not fabricate a course catalog." />}
  </>;
}
