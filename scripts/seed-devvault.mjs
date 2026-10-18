import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const projectRoot = path.resolve(process.cwd());
const envPath = path.join(projectRoot, '.env.local');

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const categories = [
  {
    name: 'Programming',
    slug: 'programming',
    description: 'Core languages, tooling, and engineering systems used by modern software teams.',
    categoryType: 'technology',
    isPublic: true,
  },
  {
    name: 'Web Development',
    slug: 'web-development',
    description: 'Frontend, backend, and product experiences for shipping polished digital products.',
    categoryType: 'technology',
    isPublic: true,
  },
  {
    name: 'AI & Automation',
    slug: 'ai-automation',
    description: 'Prompt systems, model workflows, and AI-powered product accelerators.',
    categoryType: 'technology',
    isPublic: true,
  },
  {
    name: 'Cloud & DevOps',
    slug: 'cloud-devops',
    description: 'Infrastructure, deployment, and observability patterns for resilient systems.',
    categoryType: 'technology',
    isPublic: true,
  },
  {
    name: 'Data Engineering',
    slug: 'data-engineering',
    description: 'Data pipelines, warehousing, modeling, and analytics foundations.',
    categoryType: 'technology',
    isPublic: true,
  },
  {
    name: 'Cybersecurity',
    slug: 'cybersecurity',
    description: 'Security review patterns, threat modeling, and secure architecture guides.',
    categoryType: 'technology',
    isPublic: true,
  },
];

const products = [
  {
    title: 'TypeScript Systems Blueprint',
    slug: 'typescript-systems-blueprint',
    summary: 'A clean TypeScript architecture pack for product teams shipping maintainable backend apps.',
    description: 'A curated package covering typed contracts, API boundaries, domain layering, and strong code organization patterns for product engineering teams.',
    category: 'Programming',
    categorySlug: 'programming',
    productType: 'digital-product',
    format: 'Architecture pack',
    priceInr: 3999,
    currency: 'INR',
    imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
    badge: 'Popular',
    featured: true,
    demoIncluded: true,
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['Next.js', 'Node.js'],
    tags: ['architecture', 'types', 'engineering'],
    screenshots: ['https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80'],
    status: 'published',
    isPublished: true,
  },
  {
    title: 'Next.js Launch Kit',
    slug: 'nextjs-launch-kit',
    summary: 'Ship premium SaaS landing pages and dashboard flows with ready-made UI patterns.',
    description: 'This bundle includes templates, component recipes, routing patterns, and polished dark-mode layouts for SaaS launches.',
    category: 'Web Development',
    categorySlug: 'web-development',
    productType: 'template',
    format: 'Next.js starter',
    priceInr: 5499,
    currency: 'INR',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
    featured: true,
    demoIncluded: true,
    languages: ['JavaScript', 'TypeScript'],
    frameworks: ['Next.js', 'Tailwind CSS'],
    tags: ['saas', 'frontend', 'ui'],
    screenshots: ['https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80'],
    status: 'published',
    isPublished: true,
  },
  {
    title: 'AI Copilot Workflow Pack',
    slug: 'ai-copilot-workflow-pack',
    summary: 'Prompt systems, eval loops, and AI product patterns for engineering teams.',
    description: 'A set of AI assistant workflows covering prompt evaluation, judgment criteria, operational guardrails, and production team enablement.',
    category: 'AI & Automation',
    categorySlug: 'ai-automation',
    productType: 'course',
    format: 'Course + prompts',
    priceInr: 6799,
    currency: 'INR',
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80',
    badge: 'AI',
    featured: true,
    demoIncluded: true,
    languages: ['Python', 'TypeScript'],
    frameworks: ['OpenAI', 'LangChain'],
    tags: ['ai', 'prompts', 'automation'],
    screenshots: ['https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80'],
    status: 'published',
    isPublished: true,
  },
  {
    title: 'Cloud Infra Playbook',
    slug: 'cloud-infra-playbook',
    summary: 'Deployment and observability patterns for resilient production environments.',
    description: 'A practical playbook for deploying stateless apps, setting up observability, and creating safe release workflows across cloud infrastructure.',
    category: 'Cloud & DevOps',
    categorySlug: 'cloud-devops',
    productType: 'bundle',
    format: 'Operations bundle',
    priceInr: 4899,
    currency: 'INR',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80',
    badge: 'Ops',
    featured: false,
    demoIncluded: true,
    languages: ['Bash', 'YAML'],
    frameworks: ['Docker', 'Kubernetes'],
    tags: ['cloud', 'devops', 'deployments'],
    screenshots: ['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80'],
    status: 'published',
    isPublished: true,
  },
  {
    title: 'Data Pipeline Patterns',
    slug: 'data-pipeline-patterns',
    summary: 'Modern workflows for ingesting, validating, and monitoring production datasets.',
    description: 'An opinionated guide for designing resilient, observable, and operationally mature data pipelines for analytics and product data systems.',
    category: 'Data Engineering',
    categorySlug: 'data-engineering',
    productType: 'digital-product',
    format: 'Architecture pack',
    priceInr: 5799,
    currency: 'INR',
    imageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80',
    badge: 'Data',
    featured: false,
    demoIncluded: true,
    languages: ['SQL', 'Python'],
    frameworks: ['dbt', 'Airflow'],
    tags: ['data', 'pipelines', 'analytics'],
    screenshots: ['https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80'],
    status: 'published',
    isPublished: true,
  },
  {
    title: 'Security Review Templates',
    slug: 'security-review-templates',
    summary: 'Operationally focused security review checklists for releases and architecture decisions.',
    description: 'A security review pack covering threat assumptions, dependency audits, release checklists, and secure architecture signoff.',
    category: 'Cybersecurity',
    categorySlug: 'cybersecurity',
    productType: 'bundle',
    format: 'Checklist bundle',
    priceInr: 4299,
    currency: 'INR',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    badge: 'Secure',
    featured: false,
    demoIncluded: true,
    languages: ['Security', 'Operations'],
    frameworks: ['OWASP', 'NIST'],
    tags: ['security', 'review', 'risk'],
    screenshots: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'],
    status: 'published',
    isPublished: true,
  },
];

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI.');
    process.exit(1);
  }

  const dbNameFromEnv = process.env.MONGODB_DB || 'DevVault-final-db';
  await mongoose.connect(mongoUri, {
    dbName: dbNameFromEnv,
    serverSelectionTimeoutMS: 15000,
  });

  const dbName = (new URL(mongoUri)).pathname.replace(/^\//, '') || dbNameFromEnv;
  if (dbName !== dbNameFromEnv) {
    console.warn(`Mongo URI database (${dbName}) does not match MONGODB_DB (${dbNameFromEnv}).`);
  }

  const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    categoryType: { type: String, enum: ['technology', 'topic', 'bundle'], default: 'technology' },
    isPublic: { type: Boolean, default: true },
  }, { timestamps: true }));

  const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    categorySlug: String,
    productType: { type: String, enum: ['digital-product', 'course', 'template', 'bundle', 'practice-lab'], default: 'digital-product' },
    format: { type: String, required: true },
    priceInr: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    imageUrl: { type: String, required: true },
    badge: String,
    featured: { type: Boolean, default: false },
    demoIncluded: { type: Boolean, default: true },
    languages: [String],
    frameworks: [String],
    tags: [String],
    screenshots: [String],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    isPublished: { type: Boolean, default: true },
  }, { timestamps: true }));

  for (const category of categories) {
    await Category.findOneAndUpdate({ slug: category.slug }, category, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  for (const product of products) {
    await Product.findOneAndUpdate({ slug: product.slug }, product, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  const counts = {
    categories: await Category.countDocuments(),
    products: await Product.countDocuments(),
  };

  console.log('SEED_RESULT=success');
  console.log('SEED_COUNTS=' + JSON.stringify(counts));

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('SEED_RESULT=fail');
  console.error('SEED_ERROR=' + (error && error.message ? error.message : 'unknown'));
  process.exit(1);
});
