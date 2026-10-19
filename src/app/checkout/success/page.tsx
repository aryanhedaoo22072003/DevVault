import Link from 'next/link';
import { PaidCartCleanup } from '@/components/paid-cart-cleanup';
import { requireAuthenticatedUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/models/order.model';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await requireAuthenticatedUser();
  const { session_id: stripeSessionId } = await searchParams;
  await connectToDatabase();
  const order = stripeSessionId
    ? await OrderModel.findOne({ stripeCheckoutSessionId: stripeSessionId, userId: session.userId }).lean()
    : null;
  const isPaid = order?.paymentStatus === 'paid';
  const isPending = order?.paymentStatus === 'pending';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 text-center shadow-glow">
        {isPaid ? <PaidCartCleanup slugs={order.items.map((item) => item.slug)} /> : null}
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">{isPaid ? 'Payment verified' : isPending ? 'Payment confirmation pending' : 'Order not confirmed'}</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">{isPaid ? 'Your order is being processed.' : 'We are checking your payment.'}</h1>
        <p className="mt-4 text-slate-300">
          {isPaid
            ? 'A verified Stripe test-mode payment has been accepted. The purchased cart items have now been removed.'
            : 'Stripe redirects do not grant ownership. Your order will update only after the signed payment webhook confirms it as paid.'}
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
    </main>
  );
}
