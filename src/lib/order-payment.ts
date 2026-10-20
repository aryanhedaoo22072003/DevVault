import type Stripe from 'stripe';

import { connectToDatabase } from '@/lib/db';
import { getStripeClient } from '@/lib/stripe';
import { OrderModel, type OrderDocument, type OrderPaymentStatus } from '@/models/order.model';

type OrderLike = Omit<Pick<OrderDocument, '_id' | 'userId' | 'clerkUserId' | 'amount' | 'currency' | 'stripeCheckoutSessionId' | 'stripePaymentIntentId' | 'paymentStatus'>, '_id'> & {
  _id: OrderDocument['_id'] | string;
};

export type ReconciliationResult = {
  orderId: string;
  paymentStatus: OrderPaymentStatus;
  paid: boolean;
  itemSlugs: string[];
};

function paymentIntentDetails(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return { id: undefined, metadata: undefined };
  if (typeof session.payment_intent === 'string') return { id: session.payment_intent, metadata: undefined };
  return { id: session.payment_intent.id, metadata: session.payment_intent.metadata };
}

export function validateCheckoutSession(order: OrderLike, session: Stripe.Checkout.Session, requirePaymentIntentMetadata = true) {
  const orderId = String(order._id);
  if (session.livemode) throw new Error('Live Stripe sessions are forbidden.');
  if (session.mode !== 'payment') throw new Error('Stripe session is not a one-time payment.');
  if (session.id !== order.stripeCheckoutSessionId) throw new Error('Stripe Checkout Session does not match this order.');
  if (session.client_reference_id !== orderId || session.metadata?.orderId !== orderId || session.metadata?.clerkUserId !== order.clerkUserId) {
    throw new Error('Stripe Checkout Session ownership metadata does not match this order.');
  }
  if (session.currency?.toUpperCase() !== order.currency || session.amount_total !== Math.round(order.amount * 100)) {
    throw new Error('Stripe Checkout Session amount or currency does not match this order.');
  }

  const paymentIntent = paymentIntentDetails(session);
  if (order.stripePaymentIntentId && paymentIntent.id !== order.stripePaymentIntentId) {
    throw new Error('Stripe Payment Intent does not match this order.');
  }
  if (requirePaymentIntentMetadata && paymentIntent.id && (paymentIntent.metadata?.orderId !== orderId || paymentIntent.metadata?.clerkUserId !== order.clerkUserId)) {
    throw new Error('Stripe Payment Intent ownership metadata does not match this order.');
  }
  return paymentIntent.id;
}

export function buildPaidOrderFilter(order: OrderLike) {
  return {
    _id: order._id,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    paymentStatus: { $ne: 'paid' as const },
  };
}

export async function finalizePaidOrder(order: OrderLike, paymentIntentId: string | undefined, webhookEventId?: string) {
  const update = {
    $set: {
      status: 'paid' as const,
      paymentStatus: 'paid' as const,
      fulfillmentStatus: 'processing' as const,
      paidAt: new Date(),
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
    ...(webhookEventId ? { $addToSet: { webhookEventIds: webhookEventId } } : {}),
  };
  const result = await OrderModel.updateOne(
    buildPaidOrderFilter(order),
    update,
  );
  if (webhookEventId && result.modifiedCount === 0) {
    await OrderModel.updateOne(
      { _id: order._id, stripeCheckoutSessionId: order.stripeCheckoutSessionId, paymentStatus: 'paid' },
      { $addToSet: { webhookEventIds: webhookEventId } },
    );
  }
  return result;
}

export async function recordUnpaidOrderState(order: OrderLike, status: 'pending' | 'failed' | 'canceled', webhookEventId?: string) {
  if (status === 'pending') return;
  await OrderModel.updateOne(
    { _id: order._id, stripeCheckoutSessionId: order.stripeCheckoutSessionId, paymentStatus: { $ne: 'paid' as const } },
    {
      $set: {
        status: status === 'canceled' ? 'canceled' : 'failed',
        paymentStatus: status,
        fulfillmentStatus: status === 'canceled' ? 'canceled' : 'pending',
        failedAt: new Date(),
      },
      ...(webhookEventId ? { $addToSet: { webhookEventIds: webhookEventId } } : {}),
    },
  );
}

export function checkoutSessionState(session: Stripe.Checkout.Session): 'paid' | 'pending' | 'failed' | 'canceled' {
  if (session.payment_status === 'paid') return 'paid';
  if (session.status === 'expired') return 'canceled';
  const paymentIntentStatus = typeof session.payment_intent === 'object' && session.payment_intent
    ? session.payment_intent.status
    : undefined;
  if (paymentIntentStatus === 'canceled' || paymentIntentStatus === 'requires_payment_method') return 'failed';
  return 'pending';
}

export async function reconcileCheckoutSession(stripeSessionId: string, userId: string): Promise<ReconciliationResult> {
  await connectToDatabase();
  const order = await OrderModel.findOne({ stripeCheckoutSessionId: stripeSessionId, userId }).exec();
  if (!order) throw new Error('Checkout Session was not found for this account.');

  const stripeSession = await getStripeClient().checkout.sessions.retrieve(stripeSessionId, { expand: ['payment_intent'] });
  const paymentIntentId = validateCheckoutSession(order, stripeSession);
  const state = checkoutSessionState(stripeSession);

  if (state === 'paid') await finalizePaidOrder(order, paymentIntentId);
  else await recordUnpaidOrderState(order, state);

  const paymentStatus = state === 'paid' ? 'paid' : state;
  return { orderId: String(order._id), paymentStatus, paid: paymentStatus === 'paid', itemSlugs: order.items.map((item) => item.slug) };
}
