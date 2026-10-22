import mongoose from 'mongoose';

import { connectToDatabase } from '@/lib/db';
import { CategoryModel } from '@/models/category.model';
import { DigitalAssetModel } from '@/models/digital-asset.model';
import { OrderModel } from '@/models/order.model';
import { ProductModel } from '@/models/product.model';
import { UserProfileModel } from '@/models/user.model';

export const ADMIN_PAGE_SIZE = 10;

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function safePage(value: string | string[] | undefined) {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function paidRevenuePipeline() {
  return [{ $match: { paymentStatus: 'paid', currency: 'INR' } }, { $group: { _id: null, total: { $sum: '$amount' } } }];
}

export function topProductsPipeline() {
  return [
    { $match: { paymentStatus: 'paid', currency: 'INR' } }, { $unwind: '$items' },
    { $group: { _id: '$items.productId', title: { $first: '$items.title' }, units: { $sum: '$items.quantity' }, value: { $sum: '$items.subtotal' } } },
    { $sort: { units: -1 as const } }, { $limit: 5 },
  ];
}

export type SalesTrendPoint = { date: string; total: number; orders: number };
export function fillSalesTrend(rows: Array<{ _id: string; total: number; orders: number }>, maximumDays = 14): SalesTrendPoint[] {
  if (!rows.length) return [];
  const sorted = [...rows].sort((a, b) => a._id.localeCompare(b._id));
  const end = new Date(`${sorted.at(-1)!._id}T00:00:00.000Z`);
  const earliest = new Date(`${sorted[0]._id}T00:00:00.000Z`);
  const start = new Date(Math.max(earliest.getTime(), end.getTime() - (maximumDays - 1) * 86_400_000));
  const byDate = new Map(sorted.map((row) => [row._id, row]));
  const points: SalesTrendPoint[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    const date = cursor.toISOString().slice(0, 10); const row = byDate.get(date);
    points.push({ date, total: row?.total ?? 0, orders: row?.orders ?? 0 });
  }
  return points;
}

export async function getAdminOverview() {
  await connectToDatabase();
  const [totalProducts, publishedProducts, registeredProfiles, paidOrders, pendingFulfillment, categories, assets, revenue, recentOrders, topProducts, sparseSalesTrends, paidBuyerIds, profileClerkIds] = await Promise.all([
    ProductModel.countDocuments(), ProductModel.countDocuments({ status: 'published', isPublished: true }),
    UserProfileModel.countDocuments(), OrderModel.countDocuments({ paymentStatus: 'paid' }),
    OrderModel.countDocuments({ paymentStatus: 'paid', fulfillmentStatus: { $ne: 'fulfilled' } }), CategoryModel.countDocuments(), DigitalAssetModel.countDocuments(),
    OrderModel.aggregate<{ total: number }>(paidRevenuePipeline()),
    OrderModel.find({}).sort({ createdAt: -1 }).limit(5).select('customerEmail amount paymentStatus fulfillmentStatus createdAt').lean(),
    OrderModel.aggregate<{ _id: string; title: string; units: number; value: number }>(topProductsPipeline()),
    OrderModel.aggregate<{ _id: string; total: number; orders: number }>([
      { $match: { paymentStatus: 'paid', currency: 'INR' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', onNull: '$createdAt' } }, total: { $sum: '$amount' }, orders: { $sum: 1 } } },
      { $sort: { _id: -1 } }, { $limit: 14 }, { $sort: { _id: 1 } },
    ]),
    OrderModel.distinct('clerkUserId', { paymentStatus: 'paid' }),
    UserProfileModel.distinct('clerkId'),
  ]);
  const profiles = new Set(profileClerkIds);
  const paidBuyerProfiles = paidBuyerIds.filter((id) => profiles.has(id)).length;
  return { totalProducts, publishedProducts, registeredProfiles, paidBuyerProfiles, unsyncedPaidBuyers: paidBuyerIds.length - paidBuyerProfiles, paidOrders, pendingFulfillment, categories, assets, grossPaidInr: revenue[0]?.total ?? 0, recentOrders, topProducts, salesTrends: fillSalesTrend(sparseSalesTrends) };
}

export async function productHasOrders(productId: string) {
  if (!mongoose.isValidObjectId(productId)) return false;
  return Boolean(await OrderModel.exists({ 'items.productId': productId }));
}
