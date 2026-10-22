import mongoose from 'mongoose';
import { z } from 'zod';

const PATH_SLUG = 'python-zero-to-advanced';
const MODULE_SLUG = 'python-foundations';
const LESSON_SLUG = 'introduction-to-python';

const lesson = {
  title: 'Introduction to Python', slug: LESSON_SLUG, order: 0, status: 'published',
  markdown: `# Introduction to Python

Python is a general-purpose programming language designed around readable, expressive code. A Python program is a plain-text file containing instructions that the Python interpreter reads and executes. Its approachable syntax makes it useful for a first programming language, while its mature standard library and package ecosystem support professional work.

## Where Python is commonly used

- Web applications and APIs using frameworks such as Django, Flask, and FastAPI.
- Data analysis, scientific computing, and machine learning.
- Automation scripts for files, reports, tests, and repetitive operational work.
- Command-line tools, developer tooling, and infrastructure workflows.
- Education, prototypes, and production services.

Python is not automatically the best choice for every problem. Mobile user interfaces, browser code, and hard real-time systems often use other languages. Good engineering means selecting a tool based on the constraints of the project.

## How Python code executes

When you run a file with the Python implementation CPython, the interpreter parses the source code and checks its syntax. It compiles valid source into an intermediate form called bytecode. The Python virtual machine then executes those bytecode instructions. CPython may cache bytecode for imported modules, but you normally work with and distribute the original source plus its dependencies.

Execution generally proceeds from top to bottom. Function bodies are defined when Python reaches a function definition, but their statements run only when the function is called. An unhandled exception stops the current flow and reports a traceback that identifies where the error occurred.

## Common beginner mistakes

- **Incorrect indentation:** Indentation defines blocks in Python. Lines belonging to the same block must align consistently.
- **Using an undefined name:** Variable names exist only after execution assigns them. Python is case-sensitive, so \`score\` and \`Score\` are different names.
- **Combining strings and numbers directly:** \`"Age: " + 20\` raises a type error. Convert explicitly or use an f-string such as \`f"Age: {20}"\`.
- **Confusing assignment and comparison:** \`=\` assigns a value; \`==\` compares two values.
- **Shadowing built-ins:** Naming a variable \`list\`, \`str\`, or \`sum\` hides the built-in name in that scope.

## Lesson summary

Python source is parsed, compiled to bytecode by CPython, and executed by the Python virtual machine. Python is widely applicable, but its readable syntax does not remove the need to understand types, names, indentation, and errors. The next step is to run small programs, inspect their output, and learn from tracebacks.`,
  codeExamples: [
    { language: 'python', code: `message = "Hello, Python!"\nprint(message)\n\n# Expected output:\n# Hello, Python!` },
    { language: 'python', code: `price = 120\nquantity = 3\ntotal = price * quantity\nprint(f"Total: ₹{total}")\n\n# Expected output:\n# Total: ₹360` },
    { language: 'python', code: `def describe_temperature(celsius):\n    if celsius >= 30:\n        return "hot"\n    if celsius >= 20:\n        return "warm"\n    return "cool"\n\nprint(describe_temperature(24))\n\n# Expected output:\n# warm` },
  ],
  flowcharts: [{ title: 'How CPython executes a program', definition: 'Python source -> Parse and syntax check -> Compile to bytecode -> Python virtual machine executes -> Program output or traceback' }],
  quizQuestions: [
    { prompt: 'What normally executes Python bytecode in CPython?', choices: ['The web browser', 'The Python virtual machine', 'The operating system shell', 'A CSS engine'], answerIndex: 1, explanation: 'CPython compiles valid source to bytecode, which its Python virtual machine executes.' },
    { prompt: 'Which statement about Python indentation is correct?', choices: ['It is only decorative', 'It identifies code blocks', 'It is required only in comments', 'Tabs and spaces can always be mixed freely'], answerIndex: 1, explanation: 'Indentation is part of Python syntax and groups statements into blocks.' },
    { prompt: 'What does == do in Python?', choices: ['Assigns a value', 'Imports a module', 'Compares values for equality', 'Starts a comment'], answerIndex: 2, explanation: 'The equality operator == compares values, while = performs assignment.' },
    { prompt: 'When does the body of a function run?', choices: ['When Python reads the def statement', 'Only when the function is called', 'Before the file starts', 'Only during bytecode caching'], answerIndex: 1, explanation: 'The def statement creates the function; its body executes when a call invokes it.' },
    { prompt: 'Which is a safe way to combine text and a number?', choices: ['"Age: " + 20', 'f"Age: {20}"', '"Age: " == 20', 'print = 20'], answerIndex: 1, explanation: 'An f-string formats the integer as part of the resulting string without an incompatible concatenation.' },
  ],
  exercises: [
    { title: 'Personal greeting', instructions: 'Create variables for a name and a programming goal, then print one formatted greeting using an f-string.', expectedOutcomes: ['Assign meaningful string variables', 'Use an f-string to combine values safely', 'Produce one readable output line'], starterCode: `name = "Asha"\ngoal = "build reliable APIs"\n# Print: Hello Asha! Your goal is to build reliable APIs.`, language: 'python' },
    { title: 'Calculate an order total', instructions: 'Store a unit price and quantity, calculate their product, and print the total. Change the inputs and confirm the result changes.', expectedOutcomes: ['Use numeric variables', 'Apply multiplication', 'Inspect deterministic program output'], starterCode: `unit_price = 75\nquantity = 4\n# Calculate and print the total.`, language: 'python' },
    { title: 'Classify a number', instructions: 'Write a function that returns "positive", "negative", or "zero" for a supplied number. Test all three branches.', expectedOutcomes: ['Define and call a function', 'Use if and elif branches', 'Return a value for every expected case'], starterCode: `def classify(number):\n    # Add conditions and return a label.\n    pass\n\nprint(classify(8))\nprint(classify(-2))\nprint(classify(0))`, language: 'python' },
  ],
};

const quizSchema = z.object({ prompt: z.string().min(3), choices: z.array(z.string().min(1)).min(2), answerIndex: z.number().int().min(0), explanation: z.string().min(3) }).refine((item) => item.answerIndex < item.choices.length);
const lessonSchema = z.object({ title: z.string().min(3), slug: z.literal(LESSON_SLUG), status: z.literal('published'), markdown: z.string().min(500), codeExamples: z.array(z.object({ language: z.literal('python'), code: z.string().includes('Expected output:') })).min(3), flowcharts: z.array(z.object({ title: z.string().min(3), definition: z.string().refine((value) => value.split(/\s*->\s*/).length >= 3) })).min(1), quizQuestions: z.array(quizSchema).length(5), exercises: z.array(z.object({ title: z.string().min(3), instructions: z.string().min(10), expectedOutcomes: z.array(z.string().min(3)).min(1), starterCode: z.string(), language: z.literal('python') })).length(3) });

async function main() {
  const mongoUri = process.env.MONGODB_URI; if (!mongoUri) throw new Error('MONGODB_URI is required.'); lessonSchema.parse(lesson);
  await mongoose.connect(mongoUri, process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}); const collection = mongoose.connection.collection('learningpaths'); const now = new Date();
  let path = await collection.findOne({ slug: PATH_SLUG });
  if (!path) {
    const result = await collection.insertOne({ title: 'Python Programming — Zero to Advanced', slug: PATH_SLUG, subject: 'Python Programming', description: 'A progressive, text-first Python path beginning with execution fundamentals and practical programs.', status: 'draft', access: 'public', productId: '', modules: [], createdAt: now, updatedAt: now }); path = await collection.findOne({ _id: result.insertedId });
  }
  const modules = Array.isArray(path.modules) ? path.modules : []; let chapter = modules.find((entry) => entry.slug === MODULE_SLUG);
  if (!chapter) { chapter = { _id: new mongoose.Types.ObjectId(), title: 'Python Foundations', slug: MODULE_SLUG, order: modules.length, lessons: [] }; modules.push(chapter); }
  chapter.title = 'Python Foundations'; const lessons = Array.isArray(chapter.lessons) ? chapter.lessons : []; const existing = lessons.find((entry) => entry.slug === LESSON_SLUG); const lessonRecord = { ...lesson, _id: existing?._id ?? new mongoose.Types.ObjectId() };
  if (existing) Object.assign(existing, lessonRecord); else lessons.push(lessonRecord); chapter.lessons = lessons; lessonSchema.parse(lessonRecord);
  await collection.updateOne({ _id: path._id }, { $set: { title: 'Python Programming — Zero to Advanced', subject: 'Python Programming', description: 'A progressive, text-first Python path beginning with execution fundamentals and practical programs.', access: 'public', productId: '', modules, status: 'published', updatedAt: now } });
  const verified = await collection.findOne({ slug: PATH_SLUG }); const targetModule = verified.modules.find((entry) => entry.slug === MODULE_SLUG); const targetLessons = targetModule.lessons.filter((entry) => entry.slug === LESSON_SLUG);
  if (verified.status !== 'published' || targetLessons.length !== 1 || targetLessons[0].quizQuestions.length !== 5 || targetLessons[0].exercises.length !== 3) throw new Error('Post-write learning content verification failed.');
  console.log(JSON.stringify({ path: verified.slug, pathStatus: verified.status, modules: verified.modules.length, targetModule: targetModule.slug, targetLessons: targetLessons.length, codeExamples: targetLessons[0].codeExamples.length, quizzes: targetLessons[0].quizQuestions.length, exercises: targetLessons[0].exercises.length }));
  await mongoose.disconnect();
}

main().catch(async (error) => { console.error(`Python learning seed failed: ${error instanceof Error ? error.message : 'Unknown error'}`); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
