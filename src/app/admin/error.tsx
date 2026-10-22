'use client';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8"><h1 className="text-2xl font-semibold text-white">The admin dashboard could not be loaded.</h1><p className="mt-2 text-sm text-rose-100">Check the database connection and try again. Sensitive error details are not displayed.</p><button type="button" onClick={reset} className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">Try again</button></div>;
}
