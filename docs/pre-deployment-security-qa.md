# DevVault pre-deployment security QA

Run this checklist against a staging deployment with Stripe test mode, production-like Clerk configuration, a private R2 bucket, and disposable authorized accounts. Never paste credentials, session tokens, private object keys, or age secrets into test logs.

## Upload quarantine and malware release

Production uploads and replacements are intentionally denied until an operational scanner is integrated. A production release must use this sequence:

1. Upload to a non-delivery quarantine prefix using a generated object key.
2. Validate size, allowed MIME type, extension, checksum, and object metadata before scanning.
3. Trigger a scanner with read-only quarantine access and write-only result access. Authenticate scan results and bind them to the exact object version and SHA-256 digest.
4. On a clean result, copy to the private delivery prefix, verify size and SHA-256, then create or activate the database record in one reviewed operation.
5. Keep infected or failed objects inactive, remove them according to retention policy, and surface a safe owner-facing error. A timeout or unavailable scanner must fail closed.
6. Make release idempotent by object version/digest. Never deactivate the prior delivery asset until the replacement is clean and remotely verified.
7. Record asset ID, scanner result, timestamps, and safe failure codes only. Do not log credentials, private keys, file contents, or unrestricted URLs.

Until that workflow is configured and tested, confirm an owner upload and an asset replacement both return: `Production asset uploads and replacements are disabled until malware quarantine and scanning are operational.` Confirm the existing active assets remain available.

## Authenticated browser QA

Use one entitled buyer, one non-buyer, and the configured owner. Record HTTP status, visible outcome, and database count deltas without recording identities or tokens.

### R2 purchases and downloads

- As the entitled buyer, open `/dashboard/purchases`, download one PDF, and verify its local SHA-256 against the approved source manifest.
- Download a purchase containing both ZIP and PDF assets. Confirm both names, MIME types, sizes, and checksums are correct.
- Verify exactly one new download-history row per completed download and that it belongs to the authenticated buyer and asset.
- Request 11 downloads inside one minute as the same buyer. Confirm the configured first 10 are allowed and the 11th returns HTTP 429. Confirm another entitled user has an independent counter.
- As the non-buyer, request the buyer's asset ID and confirm denial without revealing whether the private object exists.
- Signed out, request the private download endpoint and confirm HTTP 401.
- Try a private delivery asset through the public preview route and confirm denial. Confirm each intended public preview remains readable anonymously.

### Learning and account isolation

- Submit a known quiz, record the server-calculated result, refresh, and confirm the attempt persists.
- Repeat the same once-only reward action and confirm the XP ledger and balance do not increase again.
- Complete a lesson, refresh its course and `/dashboard`, and confirm persisted progress.
- Sign in as the second student and confirm the first student's attempts, completion, XP, orders, downloads, and drafts are inaccessible.

### Owner controls

- Confirm the owner can open `/admin/products` and `/admin/assets`; confirm a normal student and an anonymous browser cannot.
- In a production-mode staging build without a verified scanner, attempt a new upload and a replacement. Both must fail closed before storage or database mutation.
- After a scanner is integrated, repeat with a benign owned test file and an industry-standard harmless test signature. Release only the clean file; keep the flagged file inactive.

### Stripe test mode

- Confirm both secret and publishable keys have test prefixes and the UI shows TEST MODE.
- Complete a Stripe-hosted test Checkout. Confirm the server retrieves the session and validates authenticated ownership, payment status, amount, currency, Checkout Session ID, and Payment Intent ID.
- Revisit the success URL and invoke reconciliation again. Confirm one order/entitlement transition and no duplicate cart clearing.
- Deliver the same correctly signed test webhook twice. Confirm signature verification and idempotent finalization. Confirm an invalid signature and any live-mode event are rejected.
- Exercise failed, expired, and asynchronous-payment events and confirm no paid ownership is granted without verified payment.

### Responsive UI

- At representative mobile, tablet, and desktop viewports, inspect the navbar/account menu, marketplace/cart/checkout, purchases/downloads, learning lesson/sidebar/quiz, practice editor, student dashboard, and admin tables/forms.
- Verify keyboard navigation, visible focus, dialog labels, horizontal scrolling for code/tables, contrast in light/dark themes, and no horizontal page overflow.

## Recovery drill

Perform recovery from a trusted workstation with `age`, `tar`, MongoDB Database Tools, and a separately supplied age identity or passphrase.

1. Verify the encrypted archive against its committed local checksum manifest.
2. Download the private off-device object to a newly created temporary directory and verify its SHA-256 matches the local encrypted archive.
3. Run `age --decrypt --output <temporary-archive.tar.gz> <downloaded-archive.age>` and supply the secret interactively or through the approved local identity mechanism. Never put a passphrase in shell history.
4. Run `tar -tzf <temporary-archive.tar.gz>` and compare the extracted manifest and backup checksums.
5. Restore MongoDB only to a random isolated database. The repository check is `npm run backup:verify:mongo`; it validates counts and relationships and drops the temporary database.
6. Verify all private files from the archive against the asset manifest. Do not overwrite the live database, local originals, or R2 objects.
7. Securely remove only the temporary decrypted copy after the drill. Retain the original local and off-device encrypted backups according to policy.

## Production configuration gate

- Clerk: configure the real production instance, allowed origins/domains, callback URLs, sign-in/up redirects, and the server-only owner user ID. Test direct admin-route denial.
- Stripe: retain test mode until a separately approved launch; configure the deployed HTTPS webhook URL and signing secret, subscribed events, signature verification, and retry monitoring.
- MongoDB: use least-privilege application credentials, restricted network access/private connectivity, TLS, backups, alerts, and verified TTL/unique indexes for download rate limits.
- R2: keep delivery and backup buckets private, use separate least-privilege credentials, restrict CORS, enable retention/versioning where applicable, and verify credential rotation.
- Deployment: store secrets only in the platform secret manager, restrict deploy access, enable HTTPS, retain security headers, redact sensitive logs, and alert on authorization, storage, webhook, and rate-limit failures.

