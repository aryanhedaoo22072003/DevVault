import Link from 'next/link';

import { FeaturedProducts } from '@/components/featured-products';
import { Footer } from '@/components/footer';
import { HeroSection } from '@/components/hero-section';
import { Navbar } from '@/components/navbar';
import { TechnologyGrid } from '@/components/technology-grid';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <HeroSection />
      <TechnologyGrid />
      <FeaturedProducts />
      <section className="section-shell pb-20">
        <div className="overflow-hidden rounded-[2rem] border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-slate-900 to-cyan-500/10 p-8 shadow-glow md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.22em] text-violet-300">
                DevVault platform
              </p>
              <h3 className="text-3xl font-semibold text-white md:text-4xl">
                Build faster with digital products, learning tracks, practice labs, and AI assistant workflows.
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/marketplace" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                Explore catalog
              </Link>
              <Link href="/dashboard" className="rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500">
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
