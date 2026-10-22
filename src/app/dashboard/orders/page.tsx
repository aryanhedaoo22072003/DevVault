import Link from 'next/link';

import { requireAuthenticatedUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { formatInr } from '@/lib/cart-store';
import { OrderModel } from '@/models/order.model';
import { Navbar } from '@/components/navbar';

export default async function DashboardOrdersPage() {
  const session = await requireAuthenticatedUser();
  await connectToDatabase();

  const orders = await OrderModel.find({ userId: session.userId }).sort({ createdAt: -1 }).lean();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><div className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Orders</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Your payment history</h1>
          </div>
          <Link href="/dashboard" className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200">
            Back to dashboard
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/60 p-10 text-center text-slate-300">
            <p className="text-lg font-medium text-white">No orders yet.</p>
            <p className="mt-3 text-slate-400">Your successful purchases will appear here after payment verification.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={String(order._id)} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 shadow-glow">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Order #{String(order._id).slice(-6)}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{formatInr(Number(order.amount ?? 0))}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{order.paymentStatus}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{order.fulfillmentStatus}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {order.items?.map((item) => (
                    <div key={`${String(order._id)}-${item.slug}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.category}</p>
                      <p className="mt-2 text-sm text-slate-300">{item.quantity} × {formatInr(item.unitPrice)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div></main>
  );
}
