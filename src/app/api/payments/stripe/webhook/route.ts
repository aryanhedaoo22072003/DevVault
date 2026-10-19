import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { connectToDatabase } from '@/lib/db';
import { buildWebhookOrderFilter, getPaymentTransition } from '@/lib/payment-events';
import { getStripeClient, getStripeTestConfig } from '@/lib/stripe';
import { OrderModel } from '@/models/order.model';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let config;
  try {
    config = getStripeTestConfig();
  } catch (error) {
    return NextResponse.json({ received: false, error: error instanceof Error ? error.message : 'Stripe is unavailable.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ received: false, error: 'Missing Stripe signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, config.webhookSecret);
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid Stripe webhook signature.' }, { status: 400 });
  }
  if (event.livemode) return NextResponse.json({ received: false, error: 'Live Stripe events are forbidden.' }, { status: 400 });

  const transition = getPaymentTransition(event);
  if (transition.kind === 'ignored') return NextResponse.json({ received: true });

  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  const orderId = checkoutSession.metadata?.orderId;
  const clerkUserId = checkoutSession.metadata?.clerkUserId;
  if (!orderId || !clerkUserId) return NextResponse.json({ received: false, error: 'Stripe metadata is incomplete.' }, { status: 400 });

  await connectToDatabase();
  const baseFilter = buildWebhookOrderFilter(orderId, clerkUserId, checkoutSession.id, event.id);

  const now = new Date();
  const update = transition.kind === 'paid'
    ? {
        $set: { status: 'paid', paymentStatus: 'paid', fulfillmentStatus: 'processing', paidAt: now, ...(transition.paymentIntentId ? { stripePaymentIntentId: transition.paymentIntentId } : {}) },
        $addToSet: { webhookEventIds: event.id },
      }
    : {
        $set: {
          status: transition.kind === 'expired' ? 'canceled' : 'failed',
          paymentStatus: transition.kind,
          fulfillmentStatus: transition.kind === 'expired' ? 'canceled' : 'pending',
          failedAt: now,
        },
        $addToSet: { webhookEventIds: event.id },
      };

  const filter = transition.kind === 'paid' ? baseFilter : { ...baseFilter, paymentStatus: { $ne: 'paid' as const } };
  await OrderModel.updateOne(filter, update);
  return NextResponse.json({ received: true });
}
