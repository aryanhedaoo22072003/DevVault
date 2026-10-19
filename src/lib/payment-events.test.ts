import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { buildWebhookOrderFilter, getPaymentTransition } from './payment-events';

function event(type: Stripe.Event.Type, paymentStatus: Stripe.Checkout.Session.PaymentStatus): Stripe.Event {
  return { id: 'evt_test', type, data: { object: { id: 'cs_test', object: 'checkout.session', payment_status: paymentStatus, payment_intent: 'pi_test' } } } as Stripe.Event;
}

describe('Stripe webhook processing', () => {
  it('only transitions completion events when Stripe says paid', () => {
    expect(getPaymentTransition(event('checkout.session.completed', 'unpaid'))).toEqual({ kind: 'ignored' });
    expect(getPaymentTransition(event('checkout.session.completed', 'paid'))).toEqual({ kind: 'paid', paymentIntentId: 'pi_test' });
    expect(getPaymentTransition(event('checkout.session.async_payment_succeeded', 'paid')).kind).toBe('paid');
  });

  it('maps failed and expired events without granting payment', () => {
    expect(getPaymentTransition(event('checkout.session.async_payment_failed', 'unpaid')).kind).toBe('failed');
    expect(getPaymentTransition(event('checkout.session.expired', 'unpaid')).kind).toBe('expired');
  });

  it('builds an idempotent filter that excludes duplicate event IDs', () => {
    expect(buildWebhookOrderFilter('order', 'user', 'cs', 'evt').webhookEventIds).toEqual({ $ne: 'evt' });
  });

  it('verifies signed raw payloads and rejects tampering', () => {
    const stripe = new Stripe('sk_test_unit_test_key');
    const payload = JSON.stringify({ id: 'evt_signed', object: 'event' });
    const secret = 'whsec_unit_test_secret';
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, signature, secret).id).toBe('evt_signed');
    expect(() => stripe.webhooks.constructEvent(`${payload}x`, signature, secret)).toThrow();
  });
});
