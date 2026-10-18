import { NextResponse } from 'next/server';

import { syncUserProfile } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { OrderModel } from '@/models/order.model';

export async function POST(request: Request) {
  const session = await syncUserProfile();
  if (!session?.userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid payment verification payload.' }, { status: 400 });
  }

  const { orderId, paymentId, signature } = (payload as {
    orderId?: string;
    paymentId?: string;
    signature?: string;
  }) ?? {};

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ success: false, error: 'Missing payment verification fields.' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const order = await OrderModel.findOne({ razorpayOrderId: orderId, userId: session.userId }).exec();
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found for this account.' }, { status: 404 });
    }

    const validSignature = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!validSignature) {
      order.paymentStatus = 'failed';
      order.status = 'failed';
      order.failedAt = new Date();
      await order.save();
      return NextResponse.json({ success: false, error: 'Payment signature verification failed.' }, { status: 400 });
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ success: true, orderId: String(order._id), status: 'paid' });
    }

    order.razorpayPaymentId = paymentId;
    order.razorpaySignature = signature;
    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.fulfillmentStatus = 'processing';
    order.paidAt = new Date();
    await order.save();

    return NextResponse.json({ success: true, orderId: String(order._id), status: 'paid' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
