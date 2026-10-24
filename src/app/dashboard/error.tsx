'use client';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"><section className="aurora-card max-w-lg rounded-3xl p-8 text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-rose-300">Dashboard unavailable</p><h1 className="mt-3 text-2xl font-semibold text-white">We could not load your progress.</h1><p className="mt-3 text-sm leading-6 text-slate-400">Your saved progress has not been changed. Try loading the dashboard again.</p><button onClick={reset} className="mt-6 rounded-full bg-gradient-to-r from-violet-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white">Try again</button></section></main>;
}
