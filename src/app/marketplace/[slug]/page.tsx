import Image from 'next/image';
import Link from 'next/link';

import { AddToCartButton } from '@/components/add-to-cart-button';
import { productCatalog } from '@/data/catalog';

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = productCatalog.find((item) => item.slug === slug);

  if (!product) {
    return (
      <main className="section-shell py-20">
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/60 p-10 text-center text-slate-300">
          Product not found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="section-shell py-12 md:py-16">
        <Link href="/marketplace" className="mb-8 inline-flex items-center text-sm text-violet-200">
          ← Back to marketplace
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Image
              src={product.image}
              alt={product.title}
              width={1200}
              height={760}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="h-[420px] w-full rounded-[2rem] object-cover shadow-glow"
            />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[product.image, product.image, product.image].map((image, index) => (
                <Image
                  key={`${product.id}-${index}`}
                  src={image}
                  alt={`${product.title} preview ${index + 1}`}
                  width={600}
                  height={220}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="h-28 w-full rounded-2xl object-cover"
                />
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-glow">
            <p className="text-xs uppercase tracking-[0.18em] text-violet-300">{product.category}</p>
            <h1 className="mt-4 text-4xl font-semibold text-white">{product.title}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">{product.description}</p>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Price</p>
                <p className="mt-2 text-3xl font-semibold text-white">{product.price}</p>
              </div>
              <div className="text-right text-sm text-slate-300">
                <div>{product.format}</div>
                <div className="mt-2 text-violet-200">{product.demoLabel}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
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
              <button className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-200 transition hover:bg-white/10" type="button">
                Download demo
              </button>
            </div>

            <ul className="mt-8 space-y-3 text-sm text-slate-300">
              <li>• Includes source files and setup notes</li>
              <li>• Demo content and guided walkthroughs included</li>
              <li>• Suitable for product teams, learners, and solo builders</li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
