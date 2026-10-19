'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCart } from '@/components/cart-provider';
import { Button } from '@/components/ui/button';

export function CheckoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { items } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (items.length === 0) {
      return;
    }

    setError(null);
    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; url?: string }
        | null;

      if (!response.ok || !payload?.success) {
        if (response.status === 401) {
          router.push('/sign-in?redirect_url=/cart');
          return;
        }

        throw new Error(payload?.error ?? 'Unable to create your checkout session.');
      }

      if (!payload.url) throw new Error('Stripe Checkout URL was not returned.');
      window.location.assign(payload.url);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to process checkout.';
      setError(message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        type="button"
        className={className}
        onClick={handleCheckout}
        disabled={isCheckingOut || items.length === 0}
      >
        {isCheckingOut ? 'Processing…' : 'Proceed to checkout'}
      </Button>
      {error ? (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
