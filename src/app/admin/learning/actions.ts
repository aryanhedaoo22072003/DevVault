'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdminAccess } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { LearningPathModel, type LearningLesson } from '@/models/learning-content.model';
import { learningLessonDraftSchema, reorderTarget } from '@/lib/learning';

const idSchema = z.string().refine(mongoose.isValidObjectId, 'Invalid content identifier.');
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'untitled';
async function loadPath(pathId: string) {
  await connectToDatabase(); const path = await LearningPathModel.findById(pathId); if (!path) throw new Error('Learning path not found.'); return path;
}

export async function createLearningPathAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = z.object({ title: z.string().trim().min(3).max(160), subject: z.string().trim().min(2).max(100), description: z.string().trim().max(2_000), access: z.enum(['public','authenticated','paid']), productId: z.string().trim().max(80).optional().default('') }).parse(Object.fromEntries(formData));
  if (parsed.access === 'paid' && !parsed.productId) throw new Error('Paid paths require a product ID.');
  await connectToDatabase(); const slug = slugify(parsed.title); if (await LearningPathModel.exists({ slug })) throw new Error('A learning path with this title already exists.');
  await LearningPathModel.create({ ...parsed, slug, status: 'draft', modules: [{ title: 'Module 1', slug: 'module-1', order: 0, lessons: [{
    title: 'Start here', slug: 'start-here', order: 0, status: 'draft',
    markdown: '# Start here\n\nThis editable draft demonstrates safe interactive notes. Replace it with your own lesson before publishing.',
    codeExamples: [{ language: 'typescript', code: 'const result = schema.safeParse(input);' }],
    flowcharts: [{ title: 'Validation flow', definition: 'Request -> Authenticate -> Validate -> Respond' }],
    quizQuestions: [{ prompt: 'Where should untrusted input be validated?', choices: ['Only in the browser', 'At the server boundary'], answerIndex: 1, explanation: 'Server-side validation remains authoritative because clients cannot be trusted.' }],
    exercises: [{ title: 'Define a safe boundary', instructions: 'Describe where authentication and validation occur in a request flow.', expectedOutcomes: ['Identify the trusted server boundary', 'Separate authentication from input validation'], starterCode: '', language: 'text' }],
  }] }] }); revalidatePath('/admin/learning');
}

export async function createModuleAction(pathId: string, title: string) {
  await requireAdminAccess(); idSchema.parse(pathId); const safeTitle = z.string().trim().min(3).max(120).parse(title); const path = await loadPath(pathId);
  path.modules.push({ title: safeTitle, slug: slugify(safeTitle), order: path.modules.length, lessons: [] }); await path.save(); revalidatePath('/admin/learning');
}

export async function createLessonAction(pathId: string, moduleId: string, title: string) {
  await requireAdminAccess(); idSchema.parse(pathId); idSchema.parse(moduleId); const safeTitle = z.string().trim().min(3).max(160).parse(title); const path = await loadPath(pathId);
  const chapter = path.modules.find((entry) => String(entry._id) === moduleId); if (!chapter) throw new Error('Module not found.');
  chapter.lessons.push({ title: safeTitle, slug: slugify(safeTitle), order: chapter.lessons.length, markdown: '', codeExamples: [], flowcharts: [], quizQuestions: [], exercises: [], status: 'draft' }); await path.save(); revalidatePath('/admin/learning');
}

export async function saveLessonDraftAction(input: unknown) {
  await requireAdminAccess(); const value = learningLessonDraftSchema.extend({ pathId: idSchema, moduleId: idSchema, lessonId: idSchema }).parse(input); const path = await loadPath(value.pathId); const chapter = path.modules.find((entry) => String(entry._id) === value.moduleId); const lesson = chapter?.lessons.find((entry) => String(entry._id) === value.lessonId); if (!lesson) throw new Error('Lesson not found.');
  Object.assign(lesson, { title: value.title, slug: slugify(value.title), markdown: value.markdown, codeExamples: value.codeExamples, flowcharts: value.flowcharts, quizQuestions: value.quizQuestions, exercises: value.exercises, status: 'draft' }); await path.save(); return { savedAt: new Date().toISOString() };
}

export async function publishLessonAction(pathId: string, moduleId: string, lessonId: string) {
  await requireAdminAccess(); [pathId,moduleId,lessonId].forEach((id) => idSchema.parse(id)); const path = await loadPath(pathId); if (path.access === 'paid' && !path.productId) throw new Error('Paid paths require a product association.');
  const chapter = path.modules.find((entry) => String(entry._id) === moduleId); const lesson = chapter?.lessons.find((entry) => String(entry._id) === lessonId); if (!lesson || lesson.title.length < 3 || !lesson.markdown.trim()) throw new Error('A lesson needs a title and notes before publishing.'); lesson.status = 'published'; path.status = 'published'; await path.save(); revalidatePath('/admin/learning'); revalidatePath(`/learn/${path.slug}`);
}

export async function reorderLessonAction(pathId: string, moduleId: string, lessonId: string, direction: 'up' | 'down') {
  await requireAdminAccess(); [pathId,moduleId,lessonId].forEach((id) => idSchema.parse(id)); const path = await loadPath(pathId); const chapter = path.modules.find((entry) => String(entry._id) === moduleId); if (!chapter) throw new Error('Module not found.');
  const index = chapter.lessons.findIndex((entry) => String(entry._id) === lessonId); const target = reorderTarget(chapter.lessons.length, index, direction); if (target === null) return;
  [chapter.lessons[index], chapter.lessons[target]] = [chapter.lessons[target], chapter.lessons[index]]; chapter.lessons.forEach((lesson, order) => { lesson.order = order; }); await path.save(); revalidatePath('/admin/learning');
}

export async function deleteDraftLessonAction(pathId: string, moduleId: string, lessonId: string) {
  await requireAdminAccess(); [pathId,moduleId,lessonId].forEach((id) => idSchema.parse(id)); const path = await loadPath(pathId); const chapter = path.modules.find((entry) => String(entry._id) === moduleId); if (!chapter) throw new Error('Module not found.');
  const lesson = chapter.lessons.find((entry) => String(entry._id) === lessonId); if (!lesson) return; if (lesson.status !== 'draft') throw new Error('Published lessons must be moved to draft before deletion.'); chapter.lessons = chapter.lessons.filter((entry) => String(entry._id) !== lessonId) as typeof chapter.lessons; chapter.lessons.forEach((entry, order) => { entry.order = order; }); await path.save(); revalidatePath('/admin/learning');
}

export type LearningWorkspaceData = Array<{ id: string; title: string; slug: string; subject: string; description: string; status: string; access: string; modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; slug: string; status: string; markdown: string; codeExamples: LearningLesson['codeExamples']; flowcharts: LearningLesson['flowcharts']; quizQuestions: LearningLesson['quizQuestions']; exercises: LearningLesson['exercises'] }> }> }>;
