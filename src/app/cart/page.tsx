'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Trash2 } from 'lucide-react';

import { CheckoutButton } from '@/components/checkout-button';
import { useCart } from '@/components/cart-provider';
import { Button } from '@/components/ui/button';
import { formatInr } from '@/lib/cart-store';
import { Navbar } from '@/components/navbar';

export default function CartPage() {
  const { items, subtotal, total, isHydrated, removeItem, clearCart } = useCart();

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><div className="px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
          Loading your cart…
        </div>
      </div></main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><div className="px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-dashed border-white/10 bg-slate-900/60 p-10 text-center shadow-glow">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-200">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.22em] text-violet-300">Cart</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Your cart is empty.</h1>
          <p className="mt-4 text-slate-400">Add a premium developer asset to continue building your stack.</p>
          <div className="mt-8 flex justify-center">
            <Link href="/marketplace">
              <Button>Browse catalog</Button>
            </Link>
          </div>
        </div>
      </div></main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><div className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-violet-300">Cart</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Your selected products</h1>
          </div>
          <Button type="button" variant="secondary" onClick={clearCart}>
            Clear cart
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.slug} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-4 shadow-glow">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-full overflow-hidden rounded-2xl sm:w-32">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 128px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.category}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">Single license • Digital delivery</p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <div className="text-xl font-semibold text-white">{formatInr(item.priceInr)}</div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.slug)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-glow">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Order summary</p>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatInr(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold text-white">
                <span>Total</span>
                <span>{formatInr(total)}</span>
              </div>
            </div>

            <CheckoutButton className="mt-6 w-full" />

            <Link href="/marketplace" className="mt-3 block">
              <Button type="button" variant="secondary" className="w-full">
                Continue shopping
              </Button>
            </Link>
          </aside>
        </div>
      </div>
    </div></main>
  );
}
