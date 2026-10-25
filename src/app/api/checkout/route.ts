import { NextResponse } from 'next/server';

import { syncUserProfile } from '@/lib/auth';
import { buildOrderPricing, parseCheckoutSlugs, unavailableCheckoutSlugs } from '@/lib/checkout';
import { connectToDatabase } from '@/lib/db';
import { env } from '@/lib/env';
import { getStripeClient, getStripeTestConfig } from '@/lib/stripe';
import { OrderModel } from '@/models/order.model';
import { ProductModel } from '@/models/product.model';
import { DigitalAssetModel } from '@/models/digital-asset.model';
import { privateStorage } from '@/lib/private-storage';

export async function POST(request: Request) {
  const session = await syncUserProfile();
  if (!session?.userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid checkout payload.' }, { status: 400 });
  }

  const slugs = parseCheckoutSlugs(payload);
  if (!slugs.length) {
    return NextResponse.json({ success: false, error: 'Your cart is empty.' }, { status: 400 });
  }
  if (slugs.length > 100) return NextResponse.json({ success: false, error: 'Cart contains too many items.' }, { status: 400 });

  let orderId: string | undefined;
  try {
    getStripeTestConfig();
    await connectToDatabase();
    const products = await ProductModel.find({
      slug: { $in: slugs },
      isPublished: true,
      status: 'published',
    }).lean();

    const deliveryAssets = await DigitalAssetModel.find({
      product: { $in: products.map((product) => product._id) },
      isPublic: false,
      isActive: true,
      storageKey: { $nin: ['', null] },
    }).select('product storageKey storageProvider fileSize mimeType').lean();
    const verifiedDeliveryAssets = await Promise.all(deliveryAssets.map(async (asset) => ({
      productId: String(asset.product),
      exists: await privateStorage.exists(asset.storageKey!, asset.storageProvider, {
        expectedSize: asset.fileSize,
        expectedMimeType: asset.mimeType,
      }),
    })));
    const deliverableProductIds = verifiedDeliveryAssets.filter((asset) => asset.exists).map((asset) => asset.productId);
    const unavailable = unavailableCheckoutSlugs(products, deliverableProductIds);
    if (unavailable.length) throw new Error(`Product cannot currently be fulfilled: ${unavailable.join(', ')}`);

    const pricing = buildOrderPricing(slugs, products);

    const order = await OrderModel.create({
      userId: session.userId,
      clerkUserId: session.userId,
      customerEmail: session.profile?.email ?? session.user.emailAddresses?.[0]?.emailAddress ?? '',
      customerName: session.user.fullName ?? session.user.firstName ?? 'Developer',
      items: pricing.items,
      amount: pricing.amount,
      currency: 'INR',
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      receipt: `devvault_${Date.now()}_${session.userId.slice(-8)}`,
    });
    orderId = String(order._id);

    const origin = env.appUrl || new URL(request.url).origin;
    const stripeSession = await getStripeClient().checkout.sessions.create({
      mode: 'payment',
      customer_email: order.customerEmail || undefined,
      client_reference_id: orderId,
      metadata: { orderId, clerkUserId: session.userId },
      payment_intent_data: { metadata: { orderId, clerkUserId: session.userId } },
      line_items: pricing.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'inr',
          unit_amount: Math.round(item.unitPrice * 100),
          product_data: { name: item.title, metadata: { productId: item.productId, slug: item.slug } },
        },
      })),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/failure?orderId=${orderId}`,
    });

    if (!stripeSession.url) throw new Error('Stripe did not return a Checkout URL.');
    order.stripeCheckoutSessionId = stripeSession.id;
    await order.save();
    return NextResponse.json({ success: true, url: stripeSession.url });
  } catch (error) {
    if (orderId) {
      await OrderModel.updateOne({ _id: orderId, paymentStatus: 'pending' }, { $set: { status: 'failed', paymentStatus: 'failed', failedAt: new Date() } }).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : 'Unable to create checkout session.';
    const unavailable = message.includes('disabled') || message.includes('credentials') || message.includes('test mode');
    return NextResponse.json({ success: false, error: message }, { status: unavailable ? 503 : 400 });
  }
}
