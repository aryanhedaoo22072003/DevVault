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

Development uploads use the `local-private` adapter rooted at `PRIVATE_STORAGE_ROOT` (default `.devvault-private`). This directory is git-ignored, rejected if configured under `public/`, and is not served by Next.js. The admin product page accepts bounded PDF, ZIP, text, Markdown, and JSON uploads.

Production can select the `s3-private` adapter with `PRIVATE_STORAGE_PROVIDER`. It supports AWS S3 and compatible HTTPS object-storage APIs, verifies uploaded size, content type, and SHA-256 metadata before returning success, and streams reads through the existing authorized application routes. Object keys and credentials are never sent to the browser. Static credentials are supported for compatible providers, but workload identity or another short-lived credential mechanism is preferred when the host supports the standard AWS credential chain.

### Private object-storage deployment

Create a dedicated private bucket with all public access blocked and no anonymous bucket or object policy. The application identity should be restricted to `GetObject`, `PutObject`, `HeadObject`, and cleanup `DeleteObject` for only the configured prefix; it does not require bucket listing or policy administration. Require TLS, enable provider-side encryption at rest (provider-managed keys or KMS), versioning, and an appropriate retention/lifecycle policy. KMS deployments must grant only the matching encrypt/decrypt/data-key permissions. Do not configure public CORS because downloads and previews are streamed by DevVault rather than linked directly.

Set `S3_PRIVATE_REGION`, `S3_PRIVATE_BUCKET`, and optionally an HTTPS `S3_PRIVATE_ENDPOINT`, prefix, and path-style setting. Keep any static access key and secret server-only. Rotate static secrets using overlapping credentials, update the deployment secret store, verify health, then revoke the old credential. Application logs must contain asset IDs and safe outcomes only—not credentials, object keys, signed URLs, Clerk tokens, or file contents.

Before changing production storage, run `npm run storage:migrate:dry-run`. It reads every local asset—including inactive audit records—validates its database size, and reports an aggregate checksum without changing MongoDB or deleting files. An actual copy additionally requires `PRIVATE_STORAGE_PROVIDER=s3-private`, working bucket configuration, `--apply`, and the exact confirmation shown by the script. Each remote object is verified before its existing asset record is atomically switched to `s3-private`; failures remain local and safe reruns resume the remainder. Local originals are never deleted automatically. Back up MongoDB and the local asset directory first, test restoration into an isolated environment, and retain them until remote versioning and restore drills have been verified.

Object storage does not replace content security operations. A production upload pipeline still needs provider-side or event-driven malware scanning with a quarantine prefix and a reviewed release step before an asset becomes active. That external scanner is not configured by this repository. A distributed download rate limiter is also still required for multi-instance production hosting.

Every `/api/downloads/:assetId` request authenticates with Clerk, rechecks a paid order and matching entitlement in MongoDB, verifies the asset is active and private, applies response hardening and a best-effort local rate limit, and records download activity without storage paths or credentials.

## Admin dashboard

All `/admin` routes are protected on the server through Clerk and an exact match against the server-only `DEVVAULT_OWNER_CLERK_USER_ID`. Missing or malformed owner configuration fails closed. Email addresses, browser values, Clerk metadata, and MongoDB role fields never grant admin access. The owner retains normal student access; every other Clerk account is student-only. The dashboard reads MongoDB data directly and includes overview analytics, products, categories, orders, customers, private digital assets, text-based learning content, and safe configuration readiness.

Monetary analytics include only verified paid INR orders and are always labeled **TEST MODE — NO REAL REVENUE**. Admin operations cannot manually mark an order paid. Products and categories referenced by marketplace history are protected from destructive deletion.

Learning content is text-first: Markdown source, code examples, flowchart definitions, quizzes, and exercises. Source content is stored without executing code or rendering arbitrary HTML; a future student interface must use a sanitized Markdown and diagram renderer.

## Browser practice and verified challenge execution

Python, JavaScript, and SQL can run locally for practice without executing code in the Next.js process. The browser loads `/devvault-browser-runner.html` in an iframe sandboxed with `allow-scripts` but without `allow-same-origin`. The resulting opaque-origin document creates a disposable worker for each run. Its CSP denies application/API connections and permits only version-pinned Pyodide and sql.js files from jsDelivr. Messages, source, tests, output, rows, duration, and concurrent work are bounded; Stop and timeout terminate the disposable worker.

Python uses Pyodide 0.27.7 and JavaScript dynamic evaluation occurs only inside the opaque-origin worker. SQL uses sql.js 1.13.0 against curated in-memory SQLite fixtures; only one read-only `SELECT`, `WITH`, or `EXPLAIN` statement is accepted. Browser code cannot access MongoDB. The browser sandbox is defense-in-depth, not a tamper-proof grader: local results are explicitly untrusted, never create `ChallengeSubmission` records, never reveal private tests, and never award XP.

The runtimes are lazy-loaded on first use, so Pyodide has a substantial one-time network/download and WebAssembly initialization cost. CSP currently requires `https://cdn.jsdelivr.net`; organizations that prohibit third-party runtime delivery must self-host the pinned distributions and update CSP deliberately. JavaScript can consume CPU until the 10-second worker termination limit, and browser memory enforcement remains dependent on the browser process.

Authenticated coding activity uses four local-practice states: Not Started, Viewed, In Progress, and Practice Passed. Practice Passed is an explicitly unverified public-example result tied to the exact SHA-256 hash of the saved language draft; editing it makes the current draft “not rechecked.” Local history retains at most 50 hash-only results per challenge and is persistently rate-limited. These states never create accepted submissions or award XP. Historical trusted `ChallengeSubmission` and coding XP records remain read-only and continue to power the separate Official Solved status.

TypeScript, C, C++, and Java are registered as editor-only future languages and are not advertised as runnable. TypeScript single-file transpilation is feasible but remains disabled pending a reviewed runtime bundle. C/C++ and Java remain disabled pending maintained, acceptably sized browser runtimes and cross-browser isolation verification.

Official challenge grading still uses the separately deployed Judge0 adapter. Submit remains disabled until the server can reach Judge0 over HTTPS, confirm the configured Python and JavaScript language IDs, and verify that sandbox networking can be disabled.

Configure `JUDGE0_ENDPOINT`, `JUDGE0_PYTHON_LANGUAGE_ID`, and `JUDGE0_JAVASCRIPT_LANGUAGE_ID` on the server. For a protected Judge0 deployment, also configure both `JUDGE0_AUTH_HEADER` and `JUDGE0_AUTH_TOKEN`. These variables must never use a `NEXT_PUBLIC_` prefix. The runner must be independently hardened and resource constrained; DevVault additionally requests network-disabled execution with CPU, wall-time, memory, file, output, code-size, and per-user request limits.

`Run Locally` evaluates only public sample cases in the browser. When configured, `Submit Solution` reads private cases server-side, returns only an aggregate grade, records the authenticated user's submission, and awards first-acceptance XP with an atomic condition. Seed or migrate the built-in challenges with `npm run seed:challenges` after configuring MongoDB.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npx next build --webpack`.
