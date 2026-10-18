'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';

import { CheckoutButton } from '@/components/checkout-button';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/cart-provider';
import { formatInr } from '@/lib/cart-store';

export function CartDrawer() {
  const { items, subtotal, total, isHydrated, isOpen, closeCart, removeItem, clearCart } = useCart();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeCart, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Close shopping cart"
        onClick={closeCart}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 shadow-2xl shadow-violet-950/20"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <ShoppingBag className="h-4 w-4 text-violet-300" />
            <h2 className="text-lg font-semibold">Your cart</h2>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label="Close cart drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isHydrated ? (
          <div className="flex flex-1 items-center justify-center px-6 text-sm text-slate-300">
            Loading your cart…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-200">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Your cart is empty</h3>
              <p className="mt-2 text-sm text-slate-400">Add a product to start building your toolkit.</p>
            </div>
            <Link href="/marketplace" onClick={closeCart} className="w-full">
              <Button className="w-full">Browse catalog</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {items.map((item) => (
                <div key={item.slug} className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 overflow-hidden rounded-xl">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.category}</p>
                          <h3 className="mt-1 text-sm font-semibold text-white line-clamp-2">{item.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.slug)}
                          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                          aria-label={`Remove ${item.title} from cart`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-2 py-1 text-xs text-slate-300">
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-200"
                            aria-label={`Decrease quantity for ${item.title}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span>1</span>
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-200"
                            aria-label={`Increase quantity for ${item.title}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-sm font-semibold text-white">{formatInr(item.priceInr)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span>{formatInr(subtotal)}</span>
              </div>
              <div className="mb-4 flex items-center justify-between text-lg font-semibold text-white">
                <span>Total</span>
                <span>{formatInr(total)}</span>
              </div>

              <div className="mb-3 flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={clearCart}>
                  Clear cart
                </Button>
                <CheckoutButton className="flex-1" />
              </div>

              <Link href="/cart" onClick={closeCart} className="block">
                <Button variant="secondary" className="w-full">View cart</Button>
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
