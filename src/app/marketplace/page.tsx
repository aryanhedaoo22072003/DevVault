import Image from 'next/image';
import Link from 'next/link';

import { AddToCartButton } from '@/components/add-to-cart-button';
import { getMarketplaceProducts } from '@/lib/marketplace';

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const { items: visibleProducts, totalItems, totalPages, currentPage, error } = await getMarketplaceProducts(resolvedParams);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="section-shell py-12 md:py-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.22em] text-violet-300">Marketplace</p>
            <h1 className="text-4xl font-semibold text-white">Discover premium developer products.</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
            {totalItems} product{totalItems === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mb-8 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4 shadow-glow">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Search</label>
              <input
                defaultValue={String(resolvedParams.q ?? '')}
                name="q"
                className="w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
                placeholder="Search products or topics"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Category</label>
              <select
                defaultValue={String(resolvedParams.category ?? 'all')}
                className="w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="all">All</option>
                <option value="Product Engineering">Product Engineering</option>
                <option value="AI Systems">AI Systems</option>
                <option value="Learning">Learning</option>
                <option value="Data Engineering">Data Engineering</option>
                <option value="Frontend">Frontend</option>
                <option value="Security">Security</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Sort</label>
              <select
                defaultValue={String(resolvedParams.sort ?? 'featured')}
                className="w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">&nbsp;</label>
              <button className="w-full rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500">
                Apply filters
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-4 shadow-glow">
              <div className="overflow-hidden rounded-[1.4rem]">
                <Image src={product.image} alt={product.title} width={900} height={560} className="h-52 w-full object-cover" />
              </div>
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{product.category}</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{product.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{product.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{product.format}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{product.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/marketplace/${product.slug}`} className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
                      Details
                    </Link>
                    <AddToCartButton
                      product={{
                        slug: product.slug,
                        title: product.title,
                        category: product.category,
                        image: product.image,
                        price: product.price,
                      }}
                      size="sm"
                      variant="secondary"
                      className="px-3"
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {error ? <p className="mt-6 text-sm text-amber-300">The product catalog is temporarily unavailable.</p> : null}
        {totalItems === 0 ? (
          <div className="mt-10 rounded-[1.5rem] border border-dashed border-white/10 bg-slate-900/60 p-10 text-center text-slate-400">
            No products match the current filters.
          </div>
        ) : null}

        <div className="mt-10 flex items-center justify-center gap-3">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={{ pathname: '/marketplace', query: { ...resolvedParams, page: String(pageNumber) } }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm ${
                pageNumber === currentPage ? 'border-violet-500 bg-violet-600 text-white' : 'border-white/10 bg-slate-900 text-slate-300'
              }`}
            >
              {pageNumber}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
