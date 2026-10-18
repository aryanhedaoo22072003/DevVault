import { ArrowRight } from 'lucide-react';

import { technologyCategories } from '@/data/catalog';

export function TechnologyGrid() {
  return (
    <section className="section-shell pb-20">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.22em] text-violet-300">
            Explore domains
          </p>
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Built for every major stack.</h2>
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white">
          Browse all categories <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {technologyCategories.map(({ title, description, count, accent, icon: Icon }) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 transition duration-300 hover:border-violet-400/50 hover:bg-slate-900"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-violet-300">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-300">{count}</span>
              </div>

              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-200">
                <span>View assets</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
