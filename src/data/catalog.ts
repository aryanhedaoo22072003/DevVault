import type { LucideIcon } from 'lucide-react';
import {
  Aperture,
  BrainCircuit,
  Code2,
  Cpu,
  Database,
  Layers3,
  Palette,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from 'lucide-react';

export type TechnologyCategory = {
  title: string;
  description: string;
  count: string;
  accent: string;
  icon: LucideIcon;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  price: string;
  format: string;
  demoLabel: string;
  image: string;
  badge: string;
  featured?: boolean;
};

export type NavItem = {
  label: string;
  href: string;
};

export const technologyCategories: TechnologyCategory[] = [
  {
    title: 'JavaScript & TypeScript',
    description: 'Modern frontend, backend, and product tooling for high-velocity teams.',
    count: '36 kits',
    accent: 'from-amber-500/20 via-yellow-500/10 to-transparent',
    icon: TerminalSquare,
  },
  {
    title: 'Python & AI',
    description: 'Prompt workflows, copilots, evaluation pipelines, and AI-powered learning systems.',
    count: '42 packs',
    accent: 'from-cyan-500/20 via-sky-500/10 to-transparent',
    icon: BrainCircuit,
  },
  {
    title: 'Data Engineering',
    description: 'Pipelines, warehousing patterns, and analytics stacks for production data teams.',
    count: '28 pipelines',
    accent: 'from-violet-500/20 via-indigo-500/10 to-transparent',
    icon: Database,
  },
  {
    title: 'Frontend Platforms',
    description: 'Design systems, component libraries, and conversion-focused UX patterns.',
    count: '51 kits',
    accent: 'from-fuchsia-500/20 via-purple-500/10 to-transparent',
    icon: Aperture,
  },
  {
    title: 'Cloud & DevOps',
    description: 'Infrastructure blueprints, observability patterns, and deployment guardrails.',
    count: '24 blueprints',
    accent: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    icon: ShieldCheck,
  },
  {
    title: 'Mobile & UX',
    description: 'App-ready flows, mobile patterns, and product design systems for fast iteration.',
    count: '18 systems',
    accent: 'from-emerald-500/20 via-green-500/10 to-transparent',
    icon: Palette,
  },
  {
    title: 'Go & Rust',
    description: 'Performance-first backend systems, secure APIs, and low-latency tooling.',
    count: '15 bundles',
    accent: 'from-orange-500/20 via-rose-500/10 to-transparent',
    icon: Cpu,
  },
  {
    title: 'Java, C#, .NET',
    description: 'Enterprise-ready architecture templates and scalable application foundations.',
    count: '22 resources',
    accent: 'from-indigo-500/20 via-violet-500/10 to-transparent',
    icon: Layers3,
  },
];

export const featuredProducts: Product[] = [
  {
    id: 'full-stack-starter-kit',
    slug: 'full-stack-starter-kit',
    title: 'Full-Stack Starter Kit',
    category: 'Product Engineering',
    description: 'A production-ready Next.js, auth, dashboard, and deployment foundation designed for SaaS teams.',
    price: '$79',
    format: 'Digital product',
    demoLabel: 'Includes demo app',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    badge: 'Popular',
  },
  {
    id: 'ai-copilot-playbook',
    slug: 'ai-copilot-playbook',
    title: 'AI Copilot Playbook',
    category: 'AI Systems',
    description: 'Reusable prompts, eval loops, AI UX patterns, and team operating rules for product copilots.',
    price: '$99',
    format: 'Course + templates',
    demoLabel: 'Includes guided walkthrough',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
  },
  {
    id: 'python-lab-collection',
    slug: 'python-lab-collection',
    title: 'Python Lab Collection',
    category: 'Learning',
    description: 'Practice sets and coding tasks across data analysis, automation, and ML workflows.',
    price: '$64',
    format: 'Interactive exercises',
    demoLabel: 'Includes sample notebooks',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80',
    badge: 'Launch',
  },
  {
    id: 'data-pipeline-blueprint',
    slug: 'data-pipeline-blueprint',
    title: 'Data Pipeline Blueprint',
    category: 'Data Engineering',
    description: 'A modular workflow for ingesting, validating, transforming, and monitoring production data.',
    price: '$89',
    format: 'Architecture pack',
    demoLabel: 'Includes sample schema',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80',
    badge: 'Pro',
  },
  {
    id: 'frontend-ux-systems',
    slug: 'frontend-ux-systems',
    title: 'Frontend UX Systems',
    category: 'Frontend',
    description: 'Build polished interfaces using reusable design tokens, layout patterns, and conversion tools.',
    price: '$74',
    format: 'Design system pack',
    demoLabel: 'Includes demo screens',
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80',
    badge: 'Featured',
  },
  {
    id: 'security-review-templates',
    slug: 'security-review-templates',
    title: 'Security Review Templates',
    category: 'Security',
    description: 'Checklist-driven templates for architecture reviews, dependency audits, and release validation.',
    price: '$54',
    format: 'Checklist bundle',
    demoLabel: 'Includes review framework',
    image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
  },
];

export const productCatalog = featuredProducts;

export const stats = [
  { label: 'Marketplace bundles', value: '200+' },
  { label: 'Learning tracks', value: '35' },
  { label: 'Practice labs', value: '120+' },
  { label: 'AI assistant tools', value: '12' },
];

export const quickLinks = ['Marketplace', 'Learning Lab', 'Practice Arena', 'AI Copilot'];

export const productHighlights = [
  { title: 'Digital products', value: 'Platform kits' },
  { title: 'Interactive learning', value: 'Guided paths' },
  { title: 'AI assistance', value: 'Built in' },
];

export const navItems: NavItem[] = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Learning', href: '/marketplace?category=Learning' },
  { label: 'Practice', href: '/practice' },
  { label: 'Tracks', href: '/practice/tracks' },
  { label: 'Dashboard', href: '/dashboard' },
];

export const trustSignals = [
  { label: 'Digital products for builders', icon: Sparkles },
  { label: 'Code practice and guided learning', icon: Code2 },
  { label: 'AI-assisted workflows', icon: Zap },
];

export const demoWorkspaceItems = [
  'TypeScript fundamentals',
  'SQL + analytics challenge',
  'AI prompt evaluation',
  'Production debugging lab',
];
