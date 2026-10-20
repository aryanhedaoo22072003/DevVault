import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { connectToDatabase } from '@/lib/db';
import { finalizePaidOrder, recordUnpaidOrderState, validateCheckoutSession } from '@/lib/order-payment';
import { buildWebhookOrderFilter, getPaymentTransition } from '@/lib/payment-events';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe';
import { OrderModel } from '@/models/order.model';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let webhookSecret;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    return NextResponse.json({ received: false, error: error instanceof Error ? error.message : 'Stripe is unavailable.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ received: false, error: 'Missing Stripe signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
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
  const order = await OrderModel.findOne(baseFilter).exec();
  if (!order) return NextResponse.json({ received: true });

  let paymentIntentId: string | undefined;
  try {
    paymentIntentId = validateCheckoutSession(order, checkoutSession, false);
  } catch {
    return NextResponse.json({ received: false, error: 'Stripe Checkout Session does not match the stored order.' }, { status: 400 });
  }

  if (transition.kind === 'paid') await finalizePaidOrder(order, paymentIntentId ?? transition.paymentIntentId, event.id);
  else await recordUnpaidOrderState(order, transition.kind === 'expired' ? 'canceled' : 'failed', event.id);
  return NextResponse.json({ received: true });
}
