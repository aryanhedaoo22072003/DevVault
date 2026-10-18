import Link from 'next/link';

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 text-center shadow-glow">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Payment verified</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Your order is being processed.</h1>
        <p className="mt-4 text-slate-300">
          A verified Razorpay test-mode payment has been accepted. Your digital purchases will appear in your account dashboard once fulfillment begins.
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
