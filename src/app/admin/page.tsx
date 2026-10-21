import Link from 'next/link';

import { requireAdminAccess } from '@/lib/auth';
import { hasAdminConfig } from '@/lib/env';

export default async function AdminPage() {
  if (!hasAdminConfig) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="section-shell py-16">
          <div className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-8 text-amber-100">
            <p className="text-sm font-medium uppercase tracking-[0.2em]">Admin access pending</p>
            <h1 className="mt-3 text-3xl font-semibold">Server-side admin authorization is not active yet.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-amber-50/90">
              Set ADMIN_EMAILS in your environment before enabling protected admin routes. This is configured in the deployment environment and never exposed to the browser.
            </p>
          </div>
        </div>
      </main>
    );
  }

  await requireAdminAccess();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="section-shell py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Admin</p>
            <h1 className="text-4xl font-semibold text-white">Product operations</h1>
          </div>
          <Link href="/admin/products" className="rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500">
            Open product manager
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Products</p>
            <p className="mt-3 text-3xl font-semibold text-white">6</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Categories</p>
            <p className="mt-3 text-3xl font-semibold text-white">12</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Assets</p>
            <p className="mt-3 text-3xl font-semibold text-white">48</p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/admin/products" className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200">
            Product manager
          </Link>
          <Link href="/admin/orders" className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200">
            Orders
          </Link>
        </div>
      </div>
    </main>
  );
}
