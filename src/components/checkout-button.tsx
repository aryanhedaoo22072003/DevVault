'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCart } from '@/components/cart-provider';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id?: string;
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => void;
      modal?: {
        ondismiss?: () => void;
      };
      prefill?: {
        name?: string;
        email?: string;
      };
    }) => {
      open: () => void;
    };
  }
}

export function CheckoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scriptId = 'razorpay-checkout-script';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

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
        | { success?: boolean; error?: string; keyId?: string; orderId?: string; amount?: number; currency?: string; description?: string; razorpayOrderId?: string; customerEmail?: string; }
        | null;

      if (!response.ok || !payload?.success) {
        if (response.status === 401) {
          router.push('/sign-in?redirect_url=/cart');
          return;
        }

        throw new Error(payload?.error ?? 'Unable to create your checkout session.');
      }

      const keyId = payload.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
      if (!keyId || !window.Razorpay) {
        throw new Error('Razorpay test checkout is not configured in this environment.');
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: payload.amount ?? total * 100,
        currency: payload.currency ?? 'INR',
        name: 'DevVault',
        description: payload.description ?? 'DevVault digital purchase',
        order_id: payload.razorpayOrderId,
        prefill: {
          email: payload.customerEmail ?? '',
        },
        modal: {
          ondismiss: () => {
            router.push(`/checkout/failure?orderId=${encodeURIComponent(payload.orderId ?? '')}&reason=${encodeURIComponent('Payment cancelled by user.')}`);
          },
        },
        handler: async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: razorpay_order_id,
              paymentId: razorpay_payment_id,
              signature: razorpay_signature,
            }),
          });

          const verifyPayload = (await verifyResponse.json().catch(() => null)) as
            | { success?: boolean; error?: string; orderId?: string; status?: string }
            | null;

          if (!verifyResponse.ok || !verifyPayload?.success) {
            router.push(`/checkout/failure?orderId=${encodeURIComponent(payload.orderId ?? '')}&reason=${encodeURIComponent(verifyPayload?.error ?? 'Payment verification failed.')}`);
            return;
          }

          clearCart();
          router.push(`/checkout/success?orderId=${encodeURIComponent(verifyPayload.orderId ?? payload.orderId ?? '')}`);
        },
      });

      razorpay.open();
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
