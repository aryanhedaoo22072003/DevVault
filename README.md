# DevVault

DevVault is a Next.js marketplace using Clerk, MongoDB/Mongoose, and Stripe-hosted Checkout.

## Stripe test-mode setup

Copy `.env.example` to `.env.local` and provide only Stripe test credentials. The application rejects `sk_live_` and `pk_live_` keys at runtime. Checkout stays disabled until the `pk_test_` publishable key and `sk_test_` secret key are present.

### Localhost without webhooks

For local development only, `http://localhost:3000/checkout/success` reconciles the returned `cs_test_` ID directly with Stripe from the server. It first requires Clerk authentication and finds the matching order for that user, then retrieves the Checkout Session with the Stripe SDK. Payment is accepted only when Stripe reports it paid and its mode, live-mode flag, order/user metadata, Payment Intent metadata, amount, currency, Checkout Session ID, and Payment Intent ID all agree with MongoDB.

The protected `POST /api/payments/stripe/reconcile` endpoint accepts `{ "sessionId": "cs_test_..." }` so an authenticated customer can recheck a pending order later. Paid finalization is atomic and idempotent. The browser redirect and client-reported state are never treated as payment proof, and cart items are removed only after this server reconciliation returns paid.

This webhook-free path is strictly for localhost/test-mode development. It is not a replacement for production webhooks, because customers may pay without returning to the success URL.

### Production webhook

Create a Stripe test-mode webhook endpoint for:

`POST https://your-app.example/api/payments/stripe/webhook`

Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`. When webhook testing or production setup begins, configure the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.

`STRIPE_WEBHOOK_SECRET` is optional for localhost reconciliation but required to use this route. The webhook is preserved for production and shares the same order validation/finalization code as local reconciliation.

Checkout prices and product details are always loaded from MongoDB. A success-page visit alone cannot mark an order paid or grant ownership.

Subscriptions and digital downloads are intentionally not enabled.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npx next build --webpack`.
