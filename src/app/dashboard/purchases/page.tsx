import Image from 'next/image';
import Link from 'next/link';

import { SecureDownloadButton } from '@/components/secure-download-button';
import { requireAuthenticatedUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { provisionOrderEntitlements } from '@/lib/entitlements';
import { formatInr } from '@/lib/cart-store';
import { DigitalAssetModel } from '@/models/digital-asset.model';
import { EntitlementModel } from '@/models/entitlement.model';
import { OrderModel } from '@/models/order.model';

export default async function PurchasesPage() {
  const session = await requireAuthenticatedUser();
  await connectToDatabase();
  const orders = await OrderModel.find({ userId: session.userId, clerkUserId: session.userId, paymentStatus: 'paid' }).sort({ paidAt: -1 }).lean();
  await Promise.all(orders.map((order) => provisionOrderEntitlements(String(order._id))));
  const entitlements = await EntitlementModel.find({ userId: session.userId, orderId: { $in: orders.map((order) => order._id) } }).lean();
  const assetIds = entitlements.flatMap((entry) => entry.assetIds);
  const assets = await DigitalAssetModel.find({ _id: { $in: assetIds }, isPublic: false, isActive: true }).lean();
  const assetsById = new Map(assets.map((asset) => [String(asset._id), asset]));
  const entitlementByItem = new Map(entitlements.map((entry) => [`${String(entry.orderId)}:${entry.productId}`, entry]));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Private library</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">My Purchases</h1>
          </div>
          <Link href="/dashboard" className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200">Dashboard</Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/60 p-10 text-center">
            <h2 className="text-xl font-semibold text-white">Your library is empty.</h2>
            <p className="mt-3 text-slate-400">Paid digital products will appear here after secure payment verification.</p>
            <Link href="/marketplace" className="mt-6 inline-flex rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white">Browse marketplace</Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {orders.flatMap((order) => order.items.map((item) => {
              const entitlement = entitlementByItem.get(`${String(order._id)}:${item.productId}`);
              const itemAssets = entitlement?.assetIds.map((id) => assetsById.get(String(id))).filter(Boolean) ?? [];
              const available = entitlement?.status === 'available' && itemAssets.length > 0;
              const deliveryState = available ? 'Available' : entitlement?.status === 'awaiting_assets' ? 'Awaiting Files' : 'Processing';
              return (
                <article key={`${String(order._id)}:${item.productId}`} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 shadow-glow">
                  {item.image ? <Image src={item.image} alt="" width={900} height={420} className="h-44 w-full object-cover" /> : null}
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Order #{String(order._id).slice(-6)} · {order.paidAt ? new Date(order.paidAt).toLocaleDateString('en-IN') : 'Paid'}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm text-slate-300">{formatInr(item.subtotal)} · Payment: paid</p>
                    <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${available ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : entitlement?.status === 'awaiting_assets' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-violet-500/30 bg-violet-500/10 text-violet-200'}`}>{deliveryState}</span>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {available ? itemAssets.map((asset) => asset ? (
                        <SecureDownloadButton key={String(asset._id)} assetId={String(asset._id)} title={asset.title} />
                      ) : null) : <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">Assets are being prepared</span>}
                    </div>
                  </div>
                </article>
              );
            }))}
          </div>
        )}
      </div>
    </main>
  );
}
