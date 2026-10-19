# DevVault

DevVault is a Next.js marketplace using Clerk, MongoDB/Mongoose, and Stripe-hosted Checkout.

## Stripe test-mode setup

Copy `.env.example` to `.env.local` and provide only Stripe test credentials. The application rejects `sk_live_` and `pk_live_` keys at runtime and keeps checkout disabled until the publishable key, secret key, and webhook signing secret are all present.

Create a Stripe test-mode webhook endpoint for:

`POST https://your-app.example/api/payments/stripe/webhook`

Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`. For local development, run `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook` and copy its `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

Checkout prices and product details are always loaded from MongoDB. Orders remain pending until a signature-verified Stripe event reports the Checkout Session as paid. The success page cannot mark an order paid or grant ownership; it only removes purchased browser-cart items after the database already says the payment is paid.

Subscriptions and digital downloads are intentionally not enabled.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npx next build --webpack`.
