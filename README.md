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

Subscriptions remain intentionally disabled.

## Private digital delivery

Paid-order line items are the ownership source of truth. Idempotent entitlement records connect a Clerk user, paid order, product snapshot, and active private assets. Products without assets remain `awaiting_assets`, and an order becomes fulfilled only after every purchased product has an available entitlement.

Development uploads use the `local-private` adapter rooted at `PRIVATE_STORAGE_ROOT` (default `.devvault-private`). This directory is git-ignored, rejected if configured under `public/`, and is not served by Next.js. The admin product page accepts bounded PDF, ZIP, text, Markdown, and JSON uploads. Production deployments must replace this local filesystem adapter with durable private object storage and a distributed rate limiter.

Every `/api/downloads/:assetId` request authenticates with Clerk, rechecks a paid order and matching entitlement in MongoDB, verifies the asset is active and private, applies response hardening and a best-effort local rate limit, and records download activity without storage paths or credentials.

## Admin dashboard

All `/admin` routes are protected on the server through Clerk and the `ADMIN_EMAILS` allowlist. The dashboard reads MongoDB data directly and includes overview analytics, products, categories, orders, customers, private digital assets, text-based learning content, and safe configuration readiness.

Monetary analytics include only verified paid INR orders and are always labeled **TEST MODE — NO REAL REVENUE**. Admin operations cannot manually mark an order paid. Products and categories referenced by marketplace history are protected from destructive deletion.

Learning content is text-first: Markdown source, code examples, flowchart definitions, quizzes, and exercises. Source content is stored without executing code or rendering arbitrary HTML; a future student interface must use a sanitized Markdown and diagram renderer.

## Isolated challenge execution

Practice execution uses a separately deployed Judge0 service. DevVault never executes submitted code in the Next.js process. Run and Submit remain disabled until the server can reach Judge0 over HTTPS, confirm the configured Python and JavaScript language IDs, and verify that sandbox networking can be disabled.

Configure `JUDGE0_ENDPOINT`, `JUDGE0_PYTHON_LANGUAGE_ID`, and `JUDGE0_JAVASCRIPT_LANGUAGE_ID` on the server. For a protected Judge0 deployment, also configure both `JUDGE0_AUTH_HEADER` and `JUDGE0_AUTH_TOKEN`. These variables must never use a `NEXT_PUBLIC_` prefix. The runner must be independently hardened and resource constrained; DevVault additionally requests network-disabled execution with CPU, wall-time, memory, file, output, code-size, and per-user request limits.

`Run` evaluates only public sample cases. `Submit` reads private cases server-side, returns only an aggregate grade, records the authenticated owner's submission, and awards first-acceptance XP with an atomic condition. Seed or migrate the built-in challenges with `npm run seed:challenges` after configuring MongoDB.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npx next build --webpack`.
