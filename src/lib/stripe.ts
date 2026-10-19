import Stripe from 'stripe';

import { env } from '@/lib/env';

export type StripeTestConfig = { publishableKey: string; secretKey: string; webhookSecret: string };

export function getStripeTestConfig(): StripeTestConfig {
  if (env.stripeSecretKey.startsWith('sk_live_') || env.stripePublishableKey.startsWith('pk_live_')) {
    throw new Error('Live Stripe credentials are forbidden. DevVault supports Stripe test mode only.');
  }
  if (!env.stripeSecretKey || !env.stripePublishableKey || !env.stripeWebhookSecret) {
    throw new Error('Stripe test checkout is disabled until all Stripe test credentials are configured.');
  }
  if (!env.stripeSecretKey.startsWith('sk_test_') || !env.stripePublishableKey.startsWith('pk_test_')) {
    throw new Error('Stripe credentials must use sk_test_ and pk_test_ test-mode keys.');
  }
  if (!env.stripeWebhookSecret.startsWith('whsec_')) throw new Error('A valid Stripe test webhook signing secret is required.');
  return { publishableKey: env.stripePublishableKey, secretKey: env.stripeSecretKey, webhookSecret: env.stripeWebhookSecret };
}

export function getStripeClient() {
  return new Stripe(getStripeTestConfig().secretKey);
}
