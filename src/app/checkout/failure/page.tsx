import Link from 'next/link';

export default function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; reason?: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-500/20 bg-red-500/5 p-8 text-center shadow-glow">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-300">Payment not confirmed</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Checkout could not be completed.</h1>
        <p className="mt-4 text-slate-300">
          This page reflects a payment failure or cancellation. No order has been marked paid unless Razorpay verification succeeded server-side.
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
