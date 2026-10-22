import Link from 'next/link';

export function AdminHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>{description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{description}</p> : null}</div>{action}</div>;
}

export function TestModeBadge() { return <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">Test mode — no real revenue</span>; }

export function EmptyState({ title, message }: { title: string; message: string }) { return <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><h2 className="font-semibold text-white">{title}</h2><p className="mt-2 text-sm text-slate-400">{message}</p></div>; }

export function Pagination({ page, pages, path, params = {} }: { page: number; pages: number; path: string; params?: Record<string, string> }) {
  const href = (next: number) => `${path}?${new URLSearchParams({ ...params, page: String(next) })}`;
  return <div className="mt-6 flex items-center justify-between text-sm text-slate-400"><span>Page {page} of {pages}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} className={`rounded-full border border-white/10 px-4 py-2 ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-white/5'}`} href={href(Math.max(1, page - 1))}>Previous</Link><Link aria-disabled={page >= pages} className={`rounded-full border border-white/10 px-4 py-2 ${page >= pages ? 'pointer-events-none opacity-40' : 'hover:bg-white/5'}`} href={href(Math.min(pages, page + 1))}>Next</Link></div></div>;
}
