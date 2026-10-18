import Link from 'next/link';

const modules = [
  { title: 'Learning roadmap', description: 'Stay on track with guided product and coding milestones.' },
  { title: 'Practice sessions', description: 'Daily labs, coding prompts, and structured exercises.' },
  { title: 'AI copilot workflows', description: 'Review prompts, build agents, and iterate faster.' },
  { title: 'Saved products', description: 'Keep your market-ready builds and learning bundles in one place.' },
  { title: 'Orders', description: 'Review your purchases, payment status, and delivery progress.', href: '/dashboard/orders' },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="section-shell py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Account dashboard</p>
            <h1 className="text-4xl font-semibold text-white">Your developer workspace</h1>
          </div>
          <Link href="/marketplace" className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200">
            Explore catalog
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {modules.map((module) => (
            <Link
              key={module.title}
              href={module.href ?? '/dashboard'}
              className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-glow transition hover:border-violet-500/40 hover:bg-slate-900"
            >
              <h2 className="text-xl font-semibold text-white">{module.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{module.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-gradient-to-r from-violet-500/10 via-slate-900 to-cyan-500/10 p-6 md:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Upcoming</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Authentication and personal learning history are ready for Clerk setup.</h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            Add your Clerk publishable and secret keys to the environment to activate signed-in customer routes and protected dashboard access.
          </p>
        </div>
      </div>
    </main>
  );
}
