import type Stripe from 'stripe';

export type PaymentTransition =
  | { kind: 'paid'; paymentIntentId?: string }
  | { kind: 'failed' }
  | { kind: 'expired' }
  | { kind: 'ignored' };

export function getPaymentTransition(event: Stripe.Event): PaymentTransition {
  if (!event.type.startsWith('checkout.session.')) return { kind: 'ignored' };
  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    if (session.payment_status !== 'paid') return { kind: 'ignored' };
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    return { kind: 'paid', paymentIntentId };
  }
  if (event.type === 'checkout.session.async_payment_failed') return { kind: 'failed' };
  if (event.type === 'checkout.session.expired') return { kind: 'expired' };
  return { kind: 'ignored' };
}

export function buildWebhookOrderFilter(orderId: string, clerkUserId: string, sessionId: string, eventId: string) {
  return {
    _id: orderId,
    clerkUserId,
    stripeCheckoutSessionId: sessionId,
    webhookEventIds: { $ne: eventId },
  };
}
