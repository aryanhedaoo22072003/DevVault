import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { buildPaidOrderFilter, checkoutSessionState, validateCheckoutSession } from './order-payment';

const order = {
  _id: 'order_123',
  userId: 'user_123',
  clerkUserId: 'user_123',
  amount: 499,
  currency: 'INR' as const,
  stripeCheckoutSessionId: 'cs_test_123',
  stripePaymentIntentId: undefined,
  paymentStatus: 'pending' as const,
};

function stripeSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: 'cs_test_123',
    object: 'checkout.session',
    livemode: false,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    amount_total: 49900,
    currency: 'inr',
    client_reference_id: 'order_123',
    metadata: { orderId: 'order_123', clerkUserId: 'user_123' },
    payment_intent: { id: 'pi_test_123', object: 'payment_intent', metadata: { orderId: 'order_123', clerkUserId: 'user_123' } },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe('Checkout Session reconciliation checks', () => {
  it('accepts a matching paid test session and Payment Intent', () => {
    expect(validateCheckoutSession(order, stripeSession())).toBe('pi_test_123');
  });

  it.each([
    ['amount', { amount_total: 1 }],
    ['currency', { currency: 'usd' }],
    ['session', { id: 'cs_test_other' }],
    ['ownership', { metadata: { orderId: 'other', clerkUserId: 'user_123' } }],
    ['live mode', { livemode: true }],
  ])('rejects a mismatched %s', (_label, override) => {
    expect(() => validateCheckoutSession(order, stripeSession(override))).toThrow();
  });

  it('rejects mismatched Payment Intent metadata or a previously stored identifier', () => {
    expect(() => validateCheckoutSession(order, stripeSession({ payment_intent: { id: 'pi_test_123', metadata: { orderId: 'other' } } as unknown as Stripe.PaymentIntent }))).toThrow();
    expect(() => validateCheckoutSession({ ...order, stripePaymentIntentId: 'pi_expected' }, stripeSession())).toThrow();
  });

  it('supports paid, pending, failed, and canceled states', () => {
    expect(checkoutSessionState(stripeSession())).toBe('paid');
    expect(checkoutSessionState(stripeSession({ payment_status: 'unpaid', status: 'open' }))).toBe('pending');
    expect(checkoutSessionState(stripeSession({
      payment_status: 'unpaid',
      status: 'complete',
      payment_intent: { status: 'canceled' } as Stripe.PaymentIntent,
    }))).toBe('failed');
    expect(checkoutSessionState(stripeSession({
      payment_status: 'unpaid',
      status: 'complete',
      payment_intent: { status: 'processing' } as Stripe.PaymentIntent,
    }))).toBe('pending');
    expect(checkoutSessionState(stripeSession({ payment_status: 'unpaid', status: 'expired' }))).toBe('canceled');
  });

  it('uses paid status as the atomic idempotency guard', () => {
    expect(buildPaidOrderFilter(order)).toMatchObject({ stripeCheckoutSessionId: 'cs_test_123', paymentStatus: { $ne: 'paid' } });
  });
});
