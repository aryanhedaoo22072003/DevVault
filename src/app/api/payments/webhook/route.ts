import { NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { OrderModel } from '@/models/order.model';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ success: false, error: 'Invalid webhook signature.' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid webhook payload.' }, { status: 400 });
  }

  const event = (payload as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } }) ?? {};
  const paymentEntity = event.payload?.payment?.entity;
  const orderIdFromEvent = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;

  if (!event.event || !orderIdFromEvent || !paymentId) {
    return NextResponse.json({ success: false, error: 'Webhook payload missing required fields.' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const order = await OrderModel.findOne({ razorpayOrderId: orderIdFromEvent }).exec();
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found for webhook event.' }, { status: 404 });
    }

    if (order.webhookEventIds.includes(event.event)) {
      return NextResponse.json({ success: true, status: 'duplicate' });
    }

    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      if (order.paymentStatus === 'paid') {
        return NextResponse.json({ success: true, status: 'already_paid' });
      }

      order.razorpayPaymentId = paymentId;
      order.paymentStatus = 'paid';
      order.status = 'paid';
      order.fulfillmentStatus = 'processing';
      order.paidAt = new Date();
      order.webhookEventIds = [...new Set([...order.webhookEventIds, event.event])];
      await order.save();
      return NextResponse.json({ success: true, status: 'paid' });
    }

    if (event.event === 'payment.failed') {
      order.paymentStatus = 'failed';
      order.status = 'failed';
      order.failedAt = new Date();
      order.webhookEventIds = [...new Set([...order.webhookEventIds, event.event])];
      await order.save();
      return NextResponse.json({ success: true, status: 'failed' });
    }

    return NextResponse.json({ success: true, status: 'ignored' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
