import Link from 'next/link';
import { ArrowRight, Code2, Play, Sparkles } from 'lucide-react';

import { demoWorkspaceItems, productHighlights, trustSignals } from '@/data/catalog';

import { Button } from './ui/button';

export function HeroSection() {
  return (
    <section className="section-shell relative overflow-hidden pb-16 pt-14 md:pb-24 md:pt-20">
      <div className="absolute inset-x-0 top-0 -z-10 h-[540px] bg-hero-glow blur-3xl" />

      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-sm luxury-accent">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="min-w-0">Digital products • learning • coding practice • AI assistance</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl lg:leading-[1.05]">
            Build, learn, and ship inside one <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-indigo-400 bg-clip-text text-transparent">exceptional workspace.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Discover premium digital products, structured learning journeys, interactive coding labs, and AI-powered workflows built for modern software teams.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/marketplace">
              <Button size="lg" className="gap-2">
                Explore marketplace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg" className="gap-2">
                <Play className="h-4 w-4" /> View dashboard
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 text-sm text-slate-300">
            {trustSignals.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Icon className="h-4 w-4 text-violet-300" />
                <span>{label}</span>
              </div>
            ))}
          </div>

        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-500/20 via-transparent to-violet-500/20 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-glow">
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-300">
                Learning workspace
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current objective</p>
                  <p className="mt-2 text-xl font-semibold text-white">Build a shipping-ready dashboard</p>
                </div>
                <div className="rounded-2xl bg-indigo-500/10 p-2 text-indigo-300">
                  <Code2 className="h-5 w-5" />
                </div>
              </div>

              <div className="mb-4 flex gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-200">app.tsx</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">schema.ts</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">prompt.md</span>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
                {demoWorkspaceItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/70 px-3 py-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {productHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{item.title}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
