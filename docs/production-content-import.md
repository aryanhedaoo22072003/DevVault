# Production content import

The canonical public content is assembled from the tracked course content modules and `scripts/production-content-manifest.mjs`. The importer manages only the five learning paths and seven product metadata records. It never writes assets, orders, entitlements, downloads, progress, XP, users, categories, or payment records.

The command is dry-run-only unless an explicit apply flag, confirmation phrase, and environment label are all present. It intentionally ignores the ordinary `MONGODB_URI` so an operator cannot accidentally target the current development database.

## Staging verification

1. Restore a recent, sanitized database backup into an isolated staging database. Asset metadata is required because the importer validates the existing 21 R2 associations but never recreates or changes them.
2. Configure server-only `CONTENT_IMPORT_MONGODB_URI`, `CONTENT_IMPORT_MONGODB_DB`, and `CONTENT_IMPORT_ENVIRONMENT=staging`. Never pass credentials on the command line or commit them.
3. Run `npm run content:import:dry-run`. Review all create/update/conflict actions. Any duplicate slug, missing asset, non-R2 provider, missing object key, or broken product reference stops the process.
4. Only against the isolated database, run `npm run content:import:apply`.
5. Run the dry run again; every canonical course/product must report `unchanged` and counts must remain 5 courses, 93 lessons, 372 examples, 372 quizzes, 93 flowcharts, 93 exercises, 7 products, and 21 assets.
6. Run the application test suite and HTTP catalog/lesson checks against staging.

For a disposable verification of the importer itself, run `npm run content:import:verify`. It creates a uniquely named temporary database, copies only product and DigitalAsset metadata, applies canonical course/product content, confirms the second run is unchanged, verifies that customer/progress collections remain empty, and drops the temporary database in a `finally` block. It does not read or write R2 object bytes.

Production use requires a fresh verified backup, maintenance window, reviewed dry-run output, and separate approval. Stable existing course, module, lesson, and product IDs are preserved by slug. New records receive IDs only when absent. Customer and progress collections are outside the write set.
