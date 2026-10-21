'use client';

export default function PurchasesError({ reset }: { error: Error; reset: () => void }) {
  return <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100"><div className="mx-auto max-w-2xl rounded-[2rem] border border-red-500/20 bg-red-500/5 p-8 text-center"><h1 className="text-2xl font-semibold">Your library could not be loaded.</h1><p className="mt-3 text-slate-300">No access was granted. Please try again.</p><button type="button" onClick={reset} className="mt-6 rounded-full bg-violet-600 px-5 py-3 text-sm font-medium">Retry</button></div></main>;
}
