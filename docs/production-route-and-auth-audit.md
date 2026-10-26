# DevVault production route and authentication audit

Audit date: 2026-10-26. Source revision audited: `fe5c762` plus the uncommitted fixes listed below. No deployment, database mutation, payment, or asset migration was performed.

## A. Confirmed root cause of deployed 401 errors

The application-side failure chain is confirmed from the reported browser evidence and source inspection:

1. A protected App Router/RSC request was redirected to Clerk's external development Account Portal.
2. The browser attempted to follow that redirect as an RSC fetch, which is cross-origin and was blocked. `X-Frame-Options: DENY` was a secondary symptom from an attempted embed, not the authentication cause.
3. `/api/learning/quiz` independently calls Clerk `auth()`. With no valid first-party session reaching the deployed origin, it correctly returned 401.

The code now sends anonymous protected navigation to the same-origin `/sign-in`, configures first-party sign-in/sign-up routes, and disables prefetch on public links to protected dashboard pages. It does **not** bypass Clerk or weaken API authorization.

The precise Vercel-side misconfiguration cannot be selected among mismatched Clerk keys, a development Clerk instance on a public deployment, an incorrect canonical origin, or absent production cookies without access to the Vercel and Clerk dashboards. The workspace `.env.local` is itself unsuitable as a production template: it has development Clerk keys and no `NEXT_PUBLIC_APP_URL`. Production authenticated QA is therefore **CONFIGURATION BLOCKED**, not claimed fixed.

## B. Full route-by-route test matrix

Legend: PASS means the observed response matched the intended behavior. CB means configuration blocked. NT means not tested. All deployed checks are CB/NT because no deployed hostname or authenticated production session was available.

### Pages

| Route | Anonymous expectation | Signed-in / owner expectation | Dependency | Local result | Deployed |
|---|---|---|---|---|---|
| `/` | 200 public | 200 | none | 200 PASS | NT |
| `/learn` | 200 published catalog | same, personalized UI allowed | MongoDB | 200 PASS | NT |
| `/learn/[pathSlug]` | public lessons render; restricted content stays gated | authorized progress UI | MongoDB, Clerk for progress | Python course and selected lesson 200 PASS | CB |
| `/marketplace` | 200 published/ready catalog | same | MongoDB | 200 PASS | NT |
| `/marketplace/[slug]` | 200 for published product | same | MongoDB | two real products 200 PASS | NT |
| `/cart` | 200 client cart | same | browser storage | 200 PASS | NT |
| `/checkout/success` | redirect to sign-in | verify only owned Stripe session | Clerk, MongoDB, Stripe test | 307 PASS | CB |
| `/checkout/failure` | redirect to sign-in | owned order state only | Clerk, MongoDB | 307 PASS | CB |
| `/practice` | 200 published challenges | adds user progress | MongoDB, optional Clerk | 200 PASS | NT |
| `/practice/[slug]` | 200 editor/public samples | drafts/local history can persist | MongoDB, Clerk for writes | Reverse String 200 PASS | CB for signed-in writes |
| `/practice/sql` | 200 playground | draft persistence after sign-in | Clerk for writes | 200 PASS | NT |
| `/practice/sql/challenges` | 200 catalog | progress after sign-in | MongoDB | 200 PASS | NT |
| `/practice/sql/challenges/[slug]` | 200 published challenge | progress after sign-in | MongoDB, Clerk for writes | real slug 200 PASS | NT |
| `/practice/tracks` | 200 catalog | progress after sign-in | MongoDB | 200 PASS | NT |
| `/practice/tracks/[slug]` | 200 published track | quiz/progress after sign-in | MongoDB, Clerk for writes | Python track 200 PASS | CB for signed-in writes |
| `/sign-in` | 200 first-party Clerk UI | redirect/appropriate Clerk state | Clerk | 200 PASS | CB |
| `/sign-up` | 200 first-party Clerk UI | redirect/appropriate Clerk state | Clerk | 200 PASS | CB |
| `/dashboard` | 307 same-origin sign-in | own dashboard only | Clerk, MongoDB | 307 PASS | CB |
| `/dashboard/learning` | 307 same-origin sign-in | own progress only | Clerk, MongoDB | 307 PASS | CB |
| `/dashboard/practice` | 307 same-origin sign-in | own practice only | Clerk, MongoDB | 307 PASS | CB |
| `/dashboard/submissions` | 307 same-origin sign-in | own submissions only | Clerk, MongoDB | 307 PASS | CB |
| `/dashboard/orders` | 307 same-origin sign-in | own orders only | Clerk, MongoDB | 307 PASS | CB |
| `/dashboard/purchases` | 307 same-origin sign-in | own entitlements only | Clerk, MongoDB, R2 | 307 PASS | CB |
| `/admin` | 307 sign-in; non-owner later denied | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |
| `/admin/assets` | same | owner only | Clerk owner ID, MongoDB, R2 | anonymous 307 PASS | CB |
| `/admin/categories` | same | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |
| `/admin/challenges` | same | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |
| `/admin/customers` | same | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |
| `/admin/customers/[id]` | same | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |
| `/admin/learning` | same | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |
| `/admin/orders` | same | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |
| `/admin/products` | same | owner only; production uploads fail closed | Clerk owner ID, MongoDB, R2 | anonymous 307 PASS | CB |
| `/admin/settings` | same | owner only | Clerk owner ID, storage config | anonymous 307 PASS | CB |
| `/admin/sql-challenges` | same | owner only | Clerk owner ID, MongoDB | anonymous 307 PASS | CB |

### Route handlers

| Route / method | Anonymous expectation | Authenticated expectation | Dependency | Local result | Deployed |
|---|---|---|---|---|---|
| `GET /api/account/capabilities` | 200, both false | student true; admin only exact owner | Clerk | 200 PASS | CB |
| `POST /api/checkout` | 401 | validated ready products; Stripe test session | Clerk, MongoDB, R2, Stripe | 401 PASS | CB |
| `GET /api/downloads/[assetId]` | 401 | entitlement-scoped stream | Clerk, MongoDB, R2, rate limiter | 401 PASS | CB |
| `POST /api/learning/complete` | 401 | accessible published lesson only | Clerk, MongoDB | 401 PASS | CB |
| `POST /api/learning/quiz` | 401 | server-graded, owner-scoped attempt | Clerk, MongoDB | 401 PASS; authenticated unit path PASS | CB |
| `POST /api/learning/visit` | 401 | owner-scoped progress | Clerk, MongoDB | 401 PASS | CB |
| `GET /api/marketplace/previews/[assetId]` | active public asset only | same | MongoDB, R2 | real PDF 200 PASS | NT |
| `POST /api/payments/stripe/reconcile` | 401 | owned test session only | Clerk, MongoDB, Stripe | 401 PASS | CB |
| `POST /api/payments/stripe/webhook` | valid Stripe signature only | same | MongoDB, Stripe secret | automated signature/idempotency tests; live HTTP NT | CB |
| `GET /api/practice/execution/status` | 200 | same | optional Judge0 | 200, operational false PASS | NT |
| `POST /api/practice/local-runs` | 401 | owner-scoped unverified zero-XP run | Clerk, MongoDB | 401 PASS | CB |
| `GET/PATCH /api/practice/playground/draft` | 401 | own draft only | Clerk, MongoDB | GET 401 PASS | CB |
| `POST /api/practice/run` | 401 | requires configured isolated runner | Clerk, MongoDB, Judge0 | 401 PASS | CB |
| `POST /api/practice/submit` | 401 | trusted runner only; zero coding XP policy | Clerk, MongoDB, Judge0 | 401 PASS | CB |
| `POST /api/practice/sql/challenges/[slug]` | 401 | owner-scoped SQL practice | Clerk, MongoDB | 401 PASS | CB |
| `PATCH /api/practice/state/[slug]` | 401 | own bookmark/draft state | Clerk, MongoDB | automated ownership tests | CB |
| `POST /api/practice/tracks/quiz` | 401 | server-graded own attempt | Clerk, MongoDB | 401 PASS | CB |
| `POST /api/practice/tracks/visit` | 401 | own progress | Clerk, MongoDB | 401 PASS | CB |

All privileged Server Actions under admin challenges, learning, products/assets, and SQL challenges call `requireAdminAccess()` independently. Admin pages additionally sit behind the owner-protected admin layout and proxy.

## C. Local-versus-Vercel configuration differences

Values were classified without printing them. Vercel values were not accessible.

| Variable | Expected format / scope | Needed | Workspace state | Vercel verification / consequence |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | exact stable origin, HTTPS in production, no path/trailing slash | build + runtime | missing | Set Production scope; missing/wrong makes Clerk `authorizedParties` fail closed and Stripe returns wrong |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | key from same Clerk instance as secret; production instance for production domain | build + runtime | development | Verify Production value; mismatch prevents usable sessions |
| `CLERK_SECRET_KEY` | server-only matching key | runtime | development | Verify Production value; mismatch makes server `auth()` reject browser state |
| `DEVVAULT_OWNER_CLERK_USER_ID` | exact `user_...`, server-only | runtime | valid shape | Verify owner from the chosen production Clerk instance; wrong value denies admin |
| `MONGODB_URI`, `MONGODB_DB` | TLS Atlas URI and intended isolated database | runtime | present | Verify Vercel egress/network access; missing breaks data pages |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` only | build + browser | test | Missing disables checkout; live is rejected |
| `STRIPE_SECRET_KEY` | `sk_test_...` only, server-only | runtime | test | Missing disables checkout; live is rejected |
| `STRIPE_WEBHOOK_SECRET` | test endpoint `whsec_...` | runtime | missing | Local reconciliation remains possible; webhook returns unavailable |
| `PRIVATE_STORAGE_PROVIDER` | `s3-private` in production | runtime | s3-private | Wrong value attempts ephemeral local storage |
| `S3_PRIVATE_ENDPOINT` | provider HTTPS endpoint | runtime | HTTPS present | Missing breaks previews/downloads |
| `S3_PRIVATE_REGION` | R2: `auto` | runtime | auto | Wrong region can fail signing |
| `S3_PRIVATE_BUCKET`, `S3_PRIVATE_PREFIX` | private bucket and scoped prefix | runtime | present | Wrong values cause missing objects |
| `S3_PRIVATE_ACCESS_KEY_ID`, `S3_PRIVATE_SECRET_ACCESS_KEY` | least-privilege server-only pair | runtime | present | Never expose as `NEXT_PUBLIC_*`; missing breaks storage |
| `MAX_PRIVATE_ASSET_BYTES` | positive integer within Vercel/provider limits | runtime | default/configured | Invalid values reject uploads |
| Judge0 variables | optional HTTPS endpoint/auth/language IDs | runtime | not required | Run/Submit remain safely unavailable |

Use a stable Vercel Production/custom domain as the canonical origin. Do not put changing commit/preview URLs in `NEXT_PUBLIC_APP_URL`; preview deployments need a separately designed Clerk preview policy, not wildcards.

## D. Files changed and rationale

- `src/proxy.ts`: same-origin protected redirect helper; Clerk `authorizedParties` and local auth URLs.
- `src/lib/env.ts`: strict canonical-origin validation plus deterministic same-origin sign-in URL construction.
- `src/app/layout.tsx`, first-party sign-in/sign-up pages, navbar/home/practice links: local Clerk routing and avoidance of anonymous protected-route prefetches.
- `src/lib/private-storage.ts`: tells Turbopack not to bundle a dynamic **development-only** local-private root while retaining key/path containment checks. Production uses R2. A clean production build emitted no filesystem tracing warning.
- `src/lib/env.test.ts` and `src/app/api/learning/quiz/route.test.ts`: origin/redirect and authenticated quiz identity regression coverage.

## E. Canonical domain and Clerk configuration

1. Select the stable Vercel Production domain (or verified custom domain), not a commit URL.
2. Set `NEXT_PUBLIC_APP_URL=https://<stable-domain>` in Vercel Production.
3. In one Clerk production instance, add that origin/domain and configure allowed redirect URLs for `/sign-in`, `/sign-up`, and `/dashboard` as appropriate.
4. Set the matching publishable and secret keys in Vercel Production. Never mix instances.
5. Set the owner user ID from that same instance.
6. Keep `/sign-in` and `/sign-up` first party. Keep `authorizedParties` exact; do not use `*`.
7. Redeploy after changing any `NEXT_PUBLIC_*` variable because it is embedded at build time.
8. Clear old-site cookies or use a clean browser profile, sign in, then verify both a document navigation and an RSC client navigation.

The current CSP does not set restrictive Clerk script/connect directives; it preserves `frame-ancestors 'none'` and `X-Frame-Options: DENY`. Do not weaken either unless the product intentionally supports framing.

## F. Database and R2 production readiness

Read-only inspection of the database configured by this workspace found 5 published courses, 93 published lessons, 7 products, 21 assets, 4 orders, 3 entitlements, and 8 download activity records. The distributed download limiter has its unique `(key, windowStartedAt)` and TTL `expiresAt` indexes. This is not proof that Vercel points to the same intended environment.

All 21 configured R2 objects passed remote HEAD, stored-size, and SHA-256 metadata comparison: 12 active private deliveries, 7 active public previews, and 2 inactive historical assets. One public preview streamed locally with HTTP 200 and attachment headers. Anonymous paid download returned 401. Authenticated/cross-account R2 downloads remain manual QA.

Connection pooling uses a module-global cached Mongoose connection/promise. Atlas must allow Vercel connectivity and use least-privilege credentials. If production content is absent, use the existing dry-run importer first (`npm run content:import:dry-run`), review the manifest, then use the explicitly confirmed apply command from a trusted operator environment. Never seed user/order/progress data.

## G. Stripe test-mode readiness

Code rejects live publishable/secret keys, verifies webhook raw bodies/signatures, rejects live events, validates session/order/user/payment-intent/amount/currency relationships, and uses idempotent finalization. Workspace Stripe API keys are test-mode; the webhook secret is missing. Configure a Stripe **test** webhook for `https://<stable-domain>/api/payments/stripe/webhook`, subscribe to the implemented checkout success/failure/expiry events, and store its `whsec_...` in Vercel Production. No checkout or webhook was executed in this audit.

## H. Filesystem tracing resolution

The warning came from Turbopack statically tracing runtime-computed paths used only by the local-private development adapter. Including that root could trace the entire repository and would not make local assets durable on Vercel. The two dynamic local paths are now explicitly excluded from serverless tracing, while `validateStorageKey`, absolute-path rejection, root containment, private/public-root separation, and file validation remain active. R2 imports and behavior are unchanged. The subsequent Turbopack production build completed without either warning.

## I. Validation results

- Node: 22.23.4 used explicitly for validation; package engine is `>=22 <23`.
- Targeted auth tests: 10 passed.
- Full suite: 229 tests passed across 48 files. An initial resource-contended parallel run timed out two child-process content checks; the isolated full rerun passed without source changes.
- ESLint and TypeScript passed. The Turbopack production build generated all 44 static page units and the complete route manifest without filesystem-tracing warnings.
- `npm audit --omit=dev`: 0 vulnerabilities. Full `npm audit`: 3 moderate build-time findings through Tailwind 3/PostCSS selector parsing. The offered fix requires the breaking Tailwind 4 upgrade, so it was not forced; no untrusted CSS is compiled at runtime.
- Local anonymous public pages: representative course, lesson, marketplace product, challenge, SQL challenge, track, sign-in and sign-up returned 200.
- Local protected pages: every dashboard and admin route returned same-origin 307 to `/sign-in`.
- Local protected APIs returned their expected 401; public capabilities and execution status returned 200.
- No authenticated browser session was available; login, logout, quiz persistence, once-only XP, owner UI, checkout, reconciliation, and entitled downloads are not claimed browser-verified.

## J. Remaining environment blockers

1. Production Vercel and Clerk environment values/key pairing are unverified.
2. A stable canonical Production hostname was not provided.
3. Production Clerk session-cookie behavior and authenticated API calls are unverified.
4. Stripe test webhook secret/endpoint must be configured and exercised.
5. Atlas Vercel connectivity and actual production dataset must be confirmed.
6. Production owner uploads/replacements intentionally fail closed until a real malware quarantine/scanner/release pipeline is operational.
7. No trusted Judge0 backend is configured; official execution remains unavailable by design.
8. Authenticated R2 entitlement, cross-user denial, and large multi-file download behavior on Vercel require manual QA. Vercel response size/runtime behavior should be observed for the largest files; streaming prevents buffering in application code but does not remove platform limits.

## K. Safe Git commit and push instructions

Review first; these commands do not deploy directly, but a connected Vercel project may deploy a pushed `main` branch:

```bash
git status --short
git diff --check
git diff
git add src/proxy.ts src/lib/env.ts src/lib/env.test.ts src/lib/private-storage.ts \
  src/app/layout.tsx src/app/page.tsx src/app/practice/page.tsx \
  src/app/practice/tracks/page.tsx src/app/sign-in/\[\[...sign-in\]\]/page.tsx \
  src/app/sign-up/\[\[...sign-up\]\]/page.tsx src/components/hero-section.tsx \
  src/components/navbar.tsx src/app/api/learning/quiz/route.test.ts \
  docs/production-route-and-auth-audit.md
git commit -m "Fix production Clerk routing and document route audit"
git push origin main
```

Configure Vercel/Clerk first if automatic production deployment is connected. This audit did not commit, push, or deploy.

## L. Post-deployment authenticated browser QA

1. Open the stable canonical domain in a clean browser; verify `/`, `/learn`, `/marketplace`, and `/practice` anonymously.
2. Navigate client-side to Dashboard; confirm same-origin `/sign-in`, no external RSC/CORS loop, then sign in.
3. Confirm `/api/account/capabilities` reports student true and admin only for the configured owner.
4. Open one public lesson, submit correct and incorrect quiz answers, complete it, refresh, sign out/in, and verify persistence and once-only XP.
5. Repeat with another user and confirm isolation. Directly try admin pages/actions as that user and confirm denial.
6. Save/restore Python, JavaScript, and SQL drafts; run only supported local public tests. Confirm Judge0-backed official actions remain unavailable.
7. Complete one Stripe test checkout, verify webhook/reconciliation idempotency and owned order/entitlement creation.
8. Download one PDF and one multi-file purchase as the buyer; confirm history insertion, cross-user denial, anonymous 401, and per-user rate limiting.
9. Open all seven public previews anonymously and confirm no private asset is accepted by the preview route.
10. Test desktop/mobile navigation, login/logout, and browser console/network panels for recurring RSC, CSP, or CORS errors.
