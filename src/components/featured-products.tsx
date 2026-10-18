import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';

import { AddToCartButton } from '@/components/add-to-cart-button';
import { featuredProducts } from '@/data/catalog';

import { Button } from './ui/button';

export function FeaturedProducts() {
  return (
    <section className="section-shell pb-20">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.22em] text-violet-300">
            Featured digital products
          </p>
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Premium resources for product builders.</h2>
        </div>
        <Link href="/marketplace">
          <Button variant="ghost" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-slate-200 hover:bg-white/5">
            Browse catalog <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {featuredProducts.map((product) => (
          <article
            key={product.id}
            className="group rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-4 shadow-glow transition hover:-translate-y-1 hover:border-violet-400/40"
          >
            <div className="relative overflow-hidden rounded-[1.4rem]">
              <Image
                src={product.image}
                alt={product.title}
                width={800}
                height={560}
                className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-full border border-violet-300/40 bg-slate-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-200">
                {product.badge}
              </span>
            </div>

            <div className="px-1 pb-1 pt-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{product.category}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {product.demoLabel}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-white">{product.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{product.description}</p>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{product.format}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{product.price}</p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <div>Demo content included</div>
                  <Link href={`/marketplace/${product.slug}`}>
                    <button className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-violet-200 transition hover:text-violet-100">
                      View details <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>

              <div className="mt-5">
                <AddToCartButton
                  product={{
                    slug: product.slug,
                    title: product.title,
                    category: product.category,
                    image: product.image,
                    price: product.price,
                  }}
                  className="w-full justify-center gap-2"
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
