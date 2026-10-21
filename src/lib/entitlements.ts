import mongoose from 'mongoose';

import { connectToDatabase } from '@/lib/db';
import { DigitalAssetModel } from '@/models/digital-asset.model';
import { EntitlementModel, type EntitlementDocument } from '@/models/entitlement.model';
import { OrderModel } from '@/models/order.model';

export function entitlementState(assetCount: number) {
  return assetCount > 0 ? 'available' as const : 'awaiting_assets' as const;
}

export function allItemsProvisioned(itemProductIds: string[], availableProductIds: string[]) {
  const available = new Set(availableProductIds);
  return itemProductIds.length > 0 && itemProductIds.every((productId) => available.has(productId));
}

export function buildEntitlementIdentity(userId: string, orderId: mongoose.Types.ObjectId | string, productId: string) {
  return { userId, orderId, productId };
}

export function buildPaidEntitlementOrderFilter(userId: string, orderId: mongoose.Types.ObjectId | string, productId: string) {
  return { _id: orderId, userId, clerkUserId: userId, paymentStatus: 'paid' as const, 'items.productId': productId };
}

export function buildPrivateAssetFilter(assetId: string) {
  return { _id: assetId, isPublic: false, isActive: true, storageKey: { $nin: ['', null] } };
}

export async function provisionOrderEntitlements(orderId: string) {
  await connectToDatabase();
  const order = await OrderModel.findOne({ _id: orderId, paymentStatus: 'paid' }).exec();
  if (!order) return { provisioned: false, fulfillmentStatus: null, entitlements: [] };

  const results: Array<EntitlementDocument | null> = [];
  for (const item of order.items) {
    const productObjectId = mongoose.isValidObjectId(item.productId) ? new mongoose.Types.ObjectId(item.productId) : null;
    const assets = productObjectId
      ? await DigitalAssetModel.find({ product: productObjectId, isPublic: false, isActive: true, storageKey: { $nin: ['', null] } }).select('_id').lean()
      : [];
    const status = entitlementState(assets.length);
    const entitlement = await EntitlementModel.findOneAndUpdate(
      buildEntitlementIdentity(order.userId, order._id, item.productId),
      {
        $set: {
          productSlug: item.slug,
          assetIds: assets.map((asset) => asset._id),
          status,
          ...(status === 'available' ? { provisionedAt: new Date() } : {}),
        },
        ...(status === 'awaiting_assets' ? { $unset: { provisionedAt: 1 } } : {}),
        $setOnInsert: { userId: order.userId, orderId: order._id, productId: item.productId },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).exec();
    results.push(entitlement);
  }

  const availableProductIds = results.filter((entry) => entry?.status === 'available').map((entry) => String(entry?.productId));
  const fulfilled = allItemsProvisioned(order.items.map((item) => item.productId), availableProductIds);
  await OrderModel.updateOne(
    { _id: order._id, paymentStatus: 'paid' },
    { $set: { fulfillmentStatus: fulfilled ? 'fulfilled' : 'processing' } },
  );
  return { provisioned: true, fulfillmentStatus: fulfilled ? 'fulfilled' as const : 'processing' as const, entitlements: results };
}

export async function provisionPaidOrdersForProduct(productId: string) {
  await connectToDatabase();
  const orders = await OrderModel.find({ paymentStatus: 'paid', 'items.productId': productId }).select('_id').lean();
  await Promise.all(orders.map((order) => provisionOrderEntitlements(String(order._id))));
}

export async function authorizeAssetDownload(userId: string, assetId: string) {
  if (!mongoose.isValidObjectId(assetId)) return null;
  await connectToDatabase();
  const entitlement = await EntitlementModel.findOne({ userId, status: 'available', assetIds: new mongoose.Types.ObjectId(assetId) }).lean();
  if (!entitlement) return null;
  const order = await OrderModel.findOne(buildPaidEntitlementOrderFilter(userId, entitlement.orderId, entitlement.productId)).exec();
  if (!order) return null;
  const asset = await DigitalAssetModel.findOne(buildPrivateAssetFilter(assetId)).lean();
  if (!asset || !entitlement.assetIds.some((id) => String(id) === String(asset._id))) return null;
  return { entitlement, order, asset };
}
