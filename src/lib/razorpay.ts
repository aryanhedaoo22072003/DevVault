import crypto from 'node:crypto';

import { env } from '@/lib/env';

export type RazorpayOrderInput = {
  amount: number;
  currency?: 'INR';
  receipt: string;
  notes?: Record<string, string>;
};

export function hasRazorpayKeys() {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

export async function createRazorpayOrderServer({ amount, currency = 'INR', receipt, notes }: RazorpayOrderInput) {
  if (!hasRazorpayKeys()) {
    throw new Error('Razorpay test credentials are not configured.');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amount),
      currency,
      receipt,
      notes: notes ?? {},
    }),
  });

  const payloadText = await response.text();
  if (!response.ok) {
    throw new Error(`Razorpay order creation failed: ${payloadText || 'Unknown server error'}`);
  }

  return JSON.parse(payloadText) as {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
  };
}

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  if (!env.razorpayKeySecret || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  if (!env.razorpayWebhookSecret || !signatureHeader) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return expected === signatureHeader;
  }
}
