import mongoose from 'mongoose';
import { javascriptModules } from './javascript-course-content.mjs';
import { buildCompleteJavascriptModules } from './javascript-course-expansion-content.mjs';

const PATH_SLUG = 'javascript-zero-to-advanced';
const completeJavascriptModules = buildCompleteJavascriptModules(javascriptModules);

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
await mongoose.connect(process.env.MONGODB_URI, process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {});

const collection = mongoose.connection.collection('learningpaths');
let path = await collection.findOne({ slug: PATH_SLUG });
const created = !path;

if (!path) {
  const now = new Date();
  const inserted = await collection.insertOne({
    title: 'JavaScript Programming — Zero to Advanced',
    slug: PATH_SLUG,
    subject: 'JavaScript Programming',
    description: 'A structured JavaScript curriculum from language foundations through browser programming, asynchronous work, and maintainable modern applications.',
    status: 'published',
    access: 'public',
    productId: '',
    modules: [],
    createdAt: now,
    updatedAt: now,
  });
  path = await collection.findOne({ _id: inserted.insertedId });
}

const modules = path.modules ?? [];
const moduleIdsBefore = new Map(modules.map((module) => [module.slug, String(module._id)]));
const lessonIdsBefore = new Map(modules.flatMap((module) => module.lessons.map((lesson) => [lesson.slug, String(lesson._id)])));

for (const moduleContent of completeJavascriptModules) {
  let learningModule = modules.find((module) => module.slug === moduleContent.slug);
  if (!learningModule) {
    learningModule = { _id: new mongoose.Types.ObjectId(), title: moduleContent.title, slug: moduleContent.slug, order: moduleContent.order, lessons: [] };
    modules.push(learningModule);
  } else {
    Object.assign(learningModule, { title: moduleContent.title, order: moduleContent.order });
  }

  for (const lessonContent of moduleContent.lessons) {
    const existing = learningModule.lessons.find((lesson) => lesson.slug === lessonContent.slug);
    if (existing) Object.assign(existing, { ...lessonContent, _id: existing._id });
    else learningModule.lessons.push({ ...lessonContent, _id: new mongoose.Types.ObjectId() });
  }
  learningModule.lessons.sort((left, right) => left.order - right.order);
}
modules.sort((left, right) => left.order - right.order);

await collection.updateOne(
  { _id: path._id },
  { $set: {
    title: 'JavaScript Programming — Zero to Advanced',
    subject: 'JavaScript Programming',
    description: 'A structured JavaScript curriculum from language foundations through browser programming, asynchronous work, and maintainable modern applications.',
    status: 'published', access: 'public', productId: '', modules, updatedAt: new Date(),
  } },
);

const verified = await collection.findOne({ _id: path._id });
const authoredModules = verified.modules.filter((module) => completeJavascriptModules.some((candidate) => candidate.slug === module.slug));
const authoredLessons = authoredModules.flatMap((module) => module.lessons.filter((lesson) => completeJavascriptModules.flatMap((candidate) => candidate.lessons).some((candidate) => candidate.slug === lesson.slug)));

if (authoredModules.length !== 4 || authoredLessons.length !== 20) throw new Error('Expected 4 JavaScript modules and 20 lessons.');
if (new Set(authoredLessons.map((lesson) => lesson.slug)).size !== 20) throw new Error('Duplicate JavaScript lesson slug detected.');
for (const lesson of authoredLessons) {
  if (lesson.status !== 'published' || lesson.codeExamples.length !== 4 || lesson.quizQuestions.length !== 4 || lesson.exercises.length !== 1) {
    throw new Error(`Incomplete JavaScript lesson: ${lesson.slug}`);
  }
}
for (const [slug, id] of moduleIdsBefore) {
  const current = authoredModules.find((module) => module.slug === slug);
  if (current && String(current._id) !== id) throw new Error(`Module ID changed: ${slug}`);
}
for (const [slug, id] of lessonIdsBefore) {
  const current = authoredLessons.find((lesson) => lesson.slug === slug);
  if (current && String(current._id) !== id) throw new Error(`Lesson ID changed: ${slug}`);
}

console.log(JSON.stringify({
  created,
  pathId: String(verified._id),
  slug: verified.slug,
  status: verified.status,
  modules: authoredModules.map((module) => ({
    id: String(module._id), slug: module.slug, title: module.title,
    lessons: module.lessons.map((lesson) => ({ id: String(lesson._id), slug: lesson.slug, title: lesson.title })),
  })),
  lessonCount: authoredLessons.length,
}));

await mongoose.disconnect();
