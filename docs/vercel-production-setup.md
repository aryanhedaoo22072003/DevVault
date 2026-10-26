# DevVault first Vercel deployment

This guide prepares a deployment; it does not authorize deployment, live Stripe, or copying development customer data. Use a staging deployment first and keep Stripe in test mode.

## Launch gates

- Use a dedicated production MongoDB database and least-privilege application user.
- Use a Clerk production instance and a real custom HTTPS domain. Development Clerk user IDs are not portable.
- Confirm the previously exposed backup-only R2 credentials have been revoked. This is currently an owner-operated blocker.
- Keep production asset upload/replacement disabled until malware quarantine and scanning are operational. Existing verified R2 assets remain readable.
- Configure the exact deployed origin in `NEXT_PUBLIC_APP_URL`; Clerk authorization and Stripe return URLs depend on it.
- Do not copy `orders`, `entitlements`, `downloadactivities`, user profiles, carts, learning/practice progress, submissions, or XP ledgers from development.

## Vercel project settings

1. Import the GitHub repository without deploying production yet.
2. Set Framework Preset to Next.js, Install Command to `npm install`, and Build Command to `npm run build` (or leave the detected defaults).
3. Select Node.js **22.x**. `package.json`, `.nvmrc`, and `.node-version` pin the application to Node 22.
4. Keep Fluid Compute enabled if available. Downloads are Node.js streaming route handlers; verify the largest PDF/ZIP against the selected plan's duration and transfer limits in staging.
5. Add a custom production domain before configuring the Clerk production instance. Do not treat a preview `*.vercel.app` URL as the final Clerk production domain.
6. Restrict project/deployment access, enable branch protection, and retain a known-good deployment for rollback.

No `vercel.json` is currently required. Next.js is auto-detected and download/preview routes explicitly use the Node.js runtime.

### Dependency audit status

`npm audit` currently reports three moderate findings through Tailwind CSS 3's build-time `postcss-nested` / `postcss-selector-parser` chain. The affected selector parser processes trusted project CSS during build; it is not imported by the deployed request handlers and no user input is compiled as CSS. npm offers only `npm audit fix --force`, which upgrades to Tailwind 4 and is a breaking migration. Do not force that upgrade at this launch gate. Keep build inputs trusted, restrict CI access, monitor for a compatible Tailwind 3 override/backport, and schedule a tested Tailwind 4 migration separately.

## Environment variables

Never paste values into source, issue trackers, or build logs. Configure Preview and Production separately in Vercel. `NEXT_PUBLIC_*` values are compiled into browser bundles; every other value below is server-only.

| Variable | Exposure | Required | Production/staging guidance |
|---|---|---:|---|
| `NEXT_PUBLIC_APP_URL` | Public, build and runtime | Yes | Exact HTTPS origin, no path or trailing slash. Use the staging origin in Preview and production custom domain in Production. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public, build and runtime | Yes | Production Clerk key for Production; separate development/preview instance key for Preview. |
| `CLERK_SECRET_KEY` | Server-only runtime | Yes | Must match the publishable key's Clerk instance. |
| `DEVVAULT_OWNER_CLERK_USER_ID` | Server-only runtime | Yes | User ID from the corresponding Clerk instance. Never reuse a development ID without verifying it exists in that instance. Missing/invalid values fail admin authorization closed. |
| `MONGODB_URI` | Server-only runtime | Yes | Dedicated Atlas production/staging URI using an application user, TLS, and least privilege. |
| `MONGODB_DB` | Server-only runtime | Yes | Dedicated database name; never point Production at the development database. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public, build and runtime | Yes for checkout | Must begin `pk_test_`. Live keys are rejected. |
| `STRIPE_SECRET_KEY` | Server-only runtime | Yes for checkout | Must begin `sk_test_`. Live keys are rejected. |
| `STRIPE_WEBHOOK_SECRET` | Server-only runtime | Yes for deployed webhook | Signing secret for the exact deployed **test-mode** webhook endpoint. |
| `PRIVATE_STORAGE_PROVIDER` | Server-only runtime | Yes | `s3-private` on Vercel. Never use `local-private` in production. |
| `MAX_PRIVATE_ASSET_BYTES` | Server-only runtime | Yes | Existing default is 52,428,800. Uploads remain production-disabled; this still bounds storage validation. |
| `S3_PRIVATE_ENDPOINT` | Server-only runtime | Yes | Cloudflare R2 HTTPS S3 endpoint. |
| `S3_PRIVATE_REGION` | Server-only runtime | Yes | `auto` for R2. |
| `S3_PRIVATE_BUCKET` | Server-only runtime | Yes | Private marketplace asset bucket. Do not use the backup bucket. |
| `S3_PRIVATE_PREFIX` | Server-only runtime | Yes | Existing verified marketplace prefix; changing it makes current keys unreadable. |
| `S3_PRIVATE_FORCE_PATH_STYLE` | Server-only runtime | Yes | Use the already validated R2 setting (`false` unless revalidated otherwise). |
| `S3_PRIVATE_ACCESS_KEY_ID` | Server-only runtime | Yes | Least-privilege marketplace bucket credential. |
| `S3_PRIVATE_SECRET_ACCESS_KEY` | Server-only runtime | Yes | Pair with the access key; never expose as `NEXT_PUBLIC_*`. |

`PRIVATE_STORAGE_ROOT` is development-only and should not be relied on by Vercel. Judge0 variables should remain unset so execution health fails closed and official Run/Submit stays unavailable.

### Operator-only content importer variables

These belong in a trusted local/CI one-off environment, not the normal Vercel application runtime:

- `CONTENT_IMPORT_MONGODB_URI`
- `CONTENT_IMPORT_MONGODB_DB`
- `CONTENT_IMPORT_ENVIRONMENT=staging` or `production`

The importer intentionally ignores `MONGODB_URI`. Run dry-run first, review every action, then use the separately confirmed apply command documented in `docs/production-content-import.md`.

## Clerk production setup

1. Create/activate the Clerk production instance and configure the custom domain DNS.
2. Configure production publishable/secret keys only in Vercel Production. Keep Preview isolated with development keys and a separate database.
3. Set allowed redirect URLs for `/sign-in`, `/sign-up`, `/`, and protected dashboard return flows on the exact HTTPS origin.
4. Configure custom OAuth credentials for every enabled social provider; development shared OAuth credentials are not a production configuration.
5. Verify the application origin is represented by `NEXT_PUBLIC_APP_URL`. `src/proxy.ts` passes that origin as Clerk `authorizedParties`; invalid/missing configuration deliberately matches no real origin.
6. Verify sign-in, sign-out to `/`, session refresh, direct `/dashboard` denial, and direct `/admin` denial for a normal user.
7. Sign in as the intended owner in the production Clerk instance and set that instance's `user_...` value as `DEVVAULT_OWNER_CLERK_USER_ID`. Do not infer ownership from email or MongoDB role fields.
8. Review Clerk's production-domain, OAuth, redirect, webhook, and CSP diagnostics before launch.

Development orders and entitlements contain development Clerk IDs and must remain in development. Production starts with no customer identities, orders, entitlements, downloads, or XP. This avoids both broken ownership and personal-data leakage.

## MongoDB and canonical content

Use a separate Atlas project or clearly isolated cluster/database, automated backups, TLS, a least-privilege application user, alerts, and the narrowest network policy compatible with Vercel. Vercel outbound addresses are not inherently a single stable IP on all plans; choose an Atlas/Vercel private connectivity or secure egress option where available. If temporarily using broad network access, compensate with unique strong credentials, least privilege, monitoring, and an explicit tightening plan.

### Safe bootstrap order

1. Create the empty production database.
2. From a trusted workstation, export only the seven `products` and 21 `digitalassets` metadata documents from the source database. Preserve their BSON ObjectIds and product references. Do not export any customer collection.
3. Inspect the export: every asset must use `s3-private`, the expected R2 prefix, and one of the seven product IDs. It must contain 12 active private assets, 7 active public previews, and 2 inactive historical assets.
4. Import those two collections into the empty target database without upsert-overwriting unrelated data. This preserves product/asset associations and historical replacement links.
5. Run `npm run content:import:dry-run` with `CONTENT_IMPORT_*` targeting production. The expected plan creates/updates five courses and leaves the seven product identities intact. Resolve any conflict; do not apply around an error.
6. After review, run `npm run content:import:apply`, followed by `npm run content:import:verify` with the deliberately selected production database environment.
7. Start the application once in a controlled staging deployment so Mongoose creates declared indexes, then verify them explicitly in Atlas.

Required indexes include `digitalassets(product,isPublic,isActive)`, entitlement ownership uniqueness, order ownership/status indexes, and the rate limiter's unique `(key,windowStartedAt)` plus TTL `expiresAt` index. Do not copy `orders`, `entitlements`, `downloadactivities`, `users`, learning progress, practice progress, drafts, submissions, carts, or XP collections.

The current canonical importer validates asset counts but does not manufacture asset metadata. Therefore the sanitized two-collection transfer is a required bootstrap step, not an optional importer feature.

## Cloudflare R2 delivery

- Keep the marketplace bucket private with no anonymous object access.
- Grant application credentials only the object operations required beneath the marketplace prefix; isolate backup credentials and bucket access.
- Existing paid and preview routes stream R2 objects through authorized Node.js route handlers. No raw object key or presigned paid URL is returned.
- Public previews still require an active, public asset database record. Paid downloads authenticate through Clerk, apply the shared MongoDB rate limit, validate entitlement/order ownership, and then stream the expected object.
- Verify the largest asset in staging. Vercel documents a 4.5 MB buffered request/response limit and recommends streaming for larger responses; these routes already return streams. Function time includes the streamed transfer, so slow large downloads still need duration testing.
- Production uploads/replacements remain disabled by policy. Do not add local filesystem fallback on Vercel.
- Confirm R2 CORS does not grant public paid-object access, encryption at rest remains enabled, and application/backup credentials are separately rotated.

## Stripe test deployment

1. Configure only `pk_test_` and `sk_test_` keys. The application rejects live prefixes at runtime.
2. Set `NEXT_PUBLIC_APP_URL` to the exact HTTPS deployment origin; Checkout success/failure URLs are built from it.
3. In Stripe test mode, register `https://<domain>/api/payments/stripe/webhook` and subscribe only to the events handled by the route: Checkout completion/async success plus failed/expired cases used by the application.
4. Store that endpoint's test signing secret as `STRIPE_WEBHOOK_SECRET`. A local CLI secret is not interchangeable with the deployed endpoint secret.
5. Confirm raw-body signature verification, duplicate event delivery, test Checkout, reconciliation, ownership/amount/currency checks, and idempotent entitlement provisioning in staging.
6. Leave live mode disabled. Production here means a deployed test environment, not real-money readiness.

## Serverless compatibility notes

- MongoDB connections are cached on `globalThis`, which reuses a connection within a warm function instance without assuming reuse across instances.
- The download rate limiter is MongoDB-backed in production and fails closed if MongoDB is unavailable. It has no production dependence on process memory.
- R2 and Stripe use supported Node.js SDKs. Download, preview, reconciliation, and webhook handlers explicitly use Node.js where required.
- Runtime asset reads are remote streams. Local filesystem writes are confined to development adapters and operator scripts; production uploads are denied before storage mutation.
- The browser Python/JavaScript/SQL practice runtimes remain client-isolated and do not execute submitted code in Vercel functions.
- The largest operational risk is transfer behavior for paid files above Vercel's buffered payload threshold. Staging must verify streaming, duration, cancellation, and download-history semantics for the largest ZIP/PDF.

## GitHub preparation (manual, no automatic push)

Review the large existing working tree as one coherent release or split it only after validating dependencies between changes:

```bash
git status --short
git diff --stat
git diff --check
git diff -- .env.example .gitignore src/proxy.ts src/lib/env.ts docs/vercel-production-setup.md
git ls-files | grep -E '(^|/)(\.env|\.devvault-private|\.devvault-backups|downloads/)'
npm test
npm run lint
npm run typecheck
npx next build --webpack
```

Then stage deliberately (never use a blind add before reviewing generated/private files):

```bash
git add .gitignore .env.example .nvmrc .node-version package.json package-lock.json
git add next.config.mjs tailwind.config.ts src public/branding assets/branding
git add scripts docs
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "Prepare DevVault for first Vercel deployment"
git status --short
```

Before any push, enable GitHub secret scanning/push protection and branch protection. Push only after reviewing the commit and confirming all credentials mentioned in incident history have been rotated:

```bash
git push origin main
```

That last command is an owner action and is intentionally not run by this preparation task.

## Post-deployment smoke test

1. Confirm `/`, `/learn`, `/practice`, `/marketplace`, branding assets, favicon, light/dark themes, and mobile navigation return correctly.
2. Confirm signed-out `/dashboard` redirects to production Clerk; sign in and sign out, then verify `/dashboard` remains protected.
3. Confirm owner access to `/admin`; verify a normal user and anonymous request are denied independently by server checks.
4. Open representative lessons from all five courses, submit a quiz, complete a lesson, refresh, and verify persistence and once-only XP behavior.
5. Confirm practice drafts/autosave work and coding practice continues to award zero XP.
6. Fetch all seven public preview routes anonymously and verify a private asset ID cannot be used there.
7. As a newly created test buyer, complete Stripe-hosted test Checkout, verify signed webhook/reconciliation, order ownership, entitlement creation, and idempotent repeat handling.
8. Download a PDF and a multi-file ZIP/PDF purchase. Verify filenames, MIME, byte count/checksum, download history, cross-user denial, anonymous 401, and the 11th same-user request within a minute returning 429.
9. Confirm production upload and replacement actions fail closed with the documented malware-scanning message.
10. Review Vercel, Clerk, Stripe, Atlas, and R2 logs without recording tokens, credentials, object keys, email addresses, or full user IDs.

## Rollback

Promote the previous known-good Vercel deployment, do not roll back by rewriting customer collections, and keep the production database/R2 backups intact. If a schema/index issue is found, stop writes, capture a new backup, and apply a reviewed forward fix. Test-mode Stripe events can be replayed only after verifying webhook idempotency and the target environment.
