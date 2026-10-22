import Link from 'next/link';
import { PaidCartCleanup } from '@/components/paid-cart-cleanup';
import { requireAuthenticatedUser } from '@/lib/auth';
import { reconcileCheckoutSession } from '@/lib/order-payment';
import { Navbar } from '@/components/navbar';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await requireAuthenticatedUser();
  const { session_id: stripeSessionId } = await searchParams;
  const result = stripeSessionId?.startsWith('cs_test_')
    ? await reconcileCheckoutSession(stripeSessionId, session.userId).catch(() => null)
    : null;
  const isPaid = result?.paid === true;
  const isPending = result?.paymentStatus === 'pending';
  const isCanceled = result?.paymentStatus === 'canceled';
  const isFailed = result?.paymentStatus === 'failed';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><div className="px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 text-center shadow-glow">
        {isPaid ? <PaidCartCleanup slugs={result.itemSlugs} /> : null}
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">{isPaid ? 'Payment verified' : isPending ? 'Payment confirmation pending' : isCanceled ? 'Checkout canceled' : isFailed ? 'Payment failed' : 'Order not confirmed'}</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">{isPaid ? 'Your order is being processed.' : isPending ? 'Your payment is still pending.' : 'Payment was not confirmed.'}</h1>
        <p className="mt-4 text-slate-300">
          {isPaid
            ? 'A verified Stripe test-mode payment has been accepted. The purchased cart items have now been removed.'
            : 'The redirect itself grants nothing. DevVault retrieved the test Checkout Session from Stripe, and the stored order was not confirmed as paid.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard/orders" className="rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-500">
            View orders
          </Link>
          <Link href="/marketplace" className="rounded-full border border-white/10 bg-slate-900/80 px-5 py-3 text-sm text-slate-200">
            Continue shopping
          </Link>
        </div>
      </div>
    </div></main>
  );
}
