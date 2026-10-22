import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { AdminHeader, EmptyState, TestModeBadge } from '@/components/admin-ui';
import { formatInr } from '@/lib/cart-store';
import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/models/order.model';
import { UserProfileModel } from '@/models/user.model';

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!mongoose.isValidObjectId(id)) notFound(); await connectToDatabase();
  const customer = await UserProfileModel.findById(id).select('name email avatarUrl createdAt clerkId').lean(); if (!customer) notFound();
  const orders = await OrderModel.find({ clerkUserId: customer.clerkId }).sort({ createdAt: -1 }).limit(50).lean();
  return <><AdminHeader eyebrow="Customer detail" title={customer.name} description={`${customer.email} · Profile created ${new Date(customer.createdAt).toLocaleDateString('en-IN')}`} /><div className="mb-5"><TestModeBadge /></div>{orders.length ? <div className="space-y-4">{orders.map((order) => <article key={String(order._id)} className="rounded-3xl border border-white/10 bg-slate-900/60 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs text-violet-300">Order …{String(order._id).slice(-8)}</p><p className="mt-2 text-xl font-semibold text-white">{formatInr(order.amount)}</p></div><div className="flex gap-2"><span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize">{order.paymentStatus}</span><span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize">{order.fulfillmentStatus}</span></div></div><ul className="mt-4 space-y-2">{order.items.map((item) => <li key={item.productId} className="text-sm text-slate-300">{item.quantity} × {item.title}</li>)}</ul></article>)}</div> : <EmptyState title="No purchase history" message="This customer has not created any orders." />}</>;
}
