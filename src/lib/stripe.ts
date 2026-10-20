import Stripe from 'stripe';

import { env } from '@/lib/env';

export type StripeTestConfig = { publishableKey: string; secretKey: string };

export function getStripeTestConfig(): StripeTestConfig {
  if (env.stripeSecretKey.startsWith('sk_live_') || env.stripePublishableKey.startsWith('pk_live_')) {
    throw new Error('Live Stripe credentials are forbidden. DevVault supports Stripe test mode only.');
  }
  if (!env.stripeSecretKey || !env.stripePublishableKey) {
    throw new Error('Stripe test checkout is disabled until the Stripe test API keys are configured.');
  }
  if (!env.stripeSecretKey.startsWith('sk_test_') || !env.stripePublishableKey.startsWith('pk_test_')) {
    throw new Error('Stripe credentials must use sk_test_ and pk_test_ test-mode keys.');
  }
  return { publishableKey: env.stripePublishableKey, secretKey: env.stripeSecretKey };
}

export function getStripeWebhookSecret() {
  getStripeTestConfig();
  if (!env.stripeWebhookSecret.startsWith('whsec_')) throw new Error('A valid Stripe test webhook signing secret is required.');
  return env.stripeWebhookSecret;
}

export function getStripeClient() {
  return new Stripe(getStripeTestConfig().secretKey);
}
