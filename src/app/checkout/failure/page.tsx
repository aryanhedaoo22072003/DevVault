import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/models/order.model';

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const session = await requireAuthenticatedUser();
  const { orderId } = await searchParams;
  await connectToDatabase();
  const order = orderId ? await OrderModel.findOne({ _id: orderId, userId: session.userId }).lean().catch(() => null) : null;
  const status = order?.paymentStatus ?? 'unverified';
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-500/20 bg-red-500/5 p-8 text-center shadow-glow">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-300">Payment not confirmed</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Checkout could not be completed.</h1>
        <p className="mt-4 text-slate-300">
          Current order status: {status}. Returning here never changes payment state. Local test reconciliation or a valid Stripe webhook must independently confirm payment.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/cart" className="rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-500">
            Return to cart
          </Link>
          <Link href="/marketplace" className="rounded-full border border-white/10 bg-slate-900/80 px-5 py-3 text-sm text-slate-200">
            Browse catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
