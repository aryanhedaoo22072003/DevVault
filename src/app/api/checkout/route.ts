import { NextResponse } from 'next/server';

import { syncUserProfile } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { env } from '@/lib/env';
import { createRazorpayOrderServer } from '@/lib/razorpay';
import { OrderModel } from '@/models/order.model';
import { ProductModel } from '@/models/product.model';

function normalizeCartItem(item: unknown) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
  if (!slug) {
    return null;
  }

  return {
    slug,
    title: typeof record.title === 'string' ? record.title.trim() : slug,
    category: typeof record.category === 'string' ? record.category.trim() : 'General',
    image: typeof record.image === 'string' ? record.image.trim() : '',
    priceInr: typeof record.priceInr === 'number' ? record.priceInr : Number(record.priceInr ?? 0),
    price: typeof record.price === 'string' || typeof record.price === 'number' ? record.price : undefined,
  };
}

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

  const items = Array.isArray((payload as { items?: unknown })?.items)
    ? (payload as { items: unknown[] }).items
        .map((item) => normalizeCartItem(item))
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  if (!items.length) {
    return NextResponse.json({ success: false, error: 'Your cart is empty.' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const productSlugs = items.map((item) => item.slug);
    const products = await ProductModel.find({
      slug: { $in: productSlugs },
      isPublished: true,
      status: 'published',
    }).lean();

    const productMap = new Map(products.map((product) => [String(product.slug), product]));

    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.slug);
      if (!product) {
        throw new Error(`Product not available: ${item.slug}`);
      }

      const amount = Number(product.priceInr ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Invalid price for ${item.title}`);
      }

      return {
        productId: String(product._id ?? item.slug),
        slug: item.slug,
        title: item.title,
        category: item.category,
        image: item.image || product.imageUrl || '',
        unitPrice: amount,
        quantity: 1,
        subtotal: amount,
      };
    });

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
    if (totalAmount <= 0) {
      throw new Error('Order total must be greater than zero.');
    }

    const order = await OrderModel.create({
      userId: session.userId,
      clerkUserId: session.userId,
      customerEmail: session.profile?.email ?? session.user.emailAddresses?.[0]?.emailAddress ?? '',
      customerName: session.user.fullName ?? session.user.firstName ?? 'Developer',
      items: normalizedItems,
      amount: totalAmount,
      currency: 'INR',
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      receipt: `devvault_${Date.now()}_${session.userId.slice(-8)}`,
    });

    const razorpayOrder = await createRazorpayOrderServer({
      amount: totalAmount * 100,
      currency: 'INR',
      receipt: String(order._id),
      notes: {
        orderId: String(order._id),
        userId: session.userId,
      },
    });

    order.razorpayOrderId = razorpayOrder.id;
    order.receipt = razorpayOrder.receipt;
    await order.save();

    return NextResponse.json({
      success: true,
      keyId: env.razorpayKeyId,
      orderId: String(order._id),
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount * 100,
      currency: 'INR',
      description: 'DevVault digital purchase',
      customerEmail: order.customerEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create checkout session.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
