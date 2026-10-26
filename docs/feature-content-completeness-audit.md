# DevVault pre-deployment feature and content audit

Audit date: 2026-10-26  
Scope: read-only application, MongoDB, content, asset metadata/storage, routes, APIs, actions, seed scripts, and tests  
Repository: `/Users/aryanhedaoo/Downloads/DevVault`

> Remediation note (2026-10-26): the disconnected Learning navigation/catalog, inert homepage category controls, dead footer links, legacy challenge metadata, and content-import reproducibility findings documented below were addressed in the subsequent completeness pass. This report remains the point-in-time audit evidence; see `docs/production-content-import.md` and current source/tests for the remediated state. The Full-Stack verification asset remains preserved pending an owner decision because it is referenced by a historical paid entitlement and download activity.

## Executive verdict

**CONTENT COMPLETE: NOT FULLY VERIFIED**  
The five lesson courses contain the expected 93 published lessons, 372 examples, 372 validly structured quiz questions, 93 flowcharts, and 93 exercises. Every lesson passed structural checks and returned HTTP 200. However, the schema has no course-thumbnail field, quiz correctness was structurally checked rather than independently subject-matter-reviewed question by question, PDF pages were not visually rendered in this audit, the practice tracks contain notably shallow sections, and one paid product has an unintended-looking active verification PDF.

**FEATURE COMPLETE: NO**  
Core marketplace, learning, practice, account, owner administration, Stripe test-mode, entitlements, and private delivery implementations exist. The public Learning navigation is disconnected from the five courses, the footer contains 15 dead `#` links, the homepage category controls are inert, official coding submission remains intentionally unavailable without a trusted runner, and several administration/content-validation paths are partial.

**READY FOR DEPLOYMENT QA: NO**  
Resolve the P1 navigation/deliverable issues, establish a reproducible production content import, and complete authenticated cross-user/payment/download browser QA first. Also ensure all production commands use Node 22; the current default shell resolved Node 20.16.0 and could not start Vitest 4.

No database record, product, price, asset, entitlement, order, progress, or application feature was changed by this audit. This document is the only file created.

## Method and evidence boundaries

- Queried the configured MongoDB database read-only and inspected the actual learning, challenge, track, product, asset, order, entitlement, download, and progress documents.
- Inspected route/page/component/action/API/model/seed source and the current test suite.
- Performed read-only object-store existence/metadata checks for all 21 DigitalAsset objects. No object was written, migrated, replaced, or deleted.
- Performed HTTP checks against the already-running local application: all 93 lesson URLs, 18 coding challenge URLs, 25 SQL challenge URLs, 7 product URLs, and 7 public preview URLs returned HTTP 200; expected titles were found on content pages.
- These HTTP checks are **not** equivalent to an interactive browser test. No reusable authorized Clerk browser session or browser automation package was available. Authenticated quiz/completion/checkout/download/admin interactions, browser console output, viewport behavior, focus order, and visual PDF rendering remain manual QA.
- PDF files were inspected structurally (EOF marker and approximate page object count); ZIP files passed `unzip -t`. No PDF rendering/parser utility was available, so typography, clipping, blank pages, bookmarks, and complete promise-to-content correspondence are not fully verified here.
- Source code establishes security and behavior only as “implemented”; it is not labeled browser-verified unless actually exercised.

## A. Complete feature inventory

Status vocabulary:

- **Implemented and verified**: exercised by automated tests and/or read-only HTTP/database/storage validation in this audit.
- **Implemented but not verified**: implementation exists but needs authorized/manual integration QA.
- **Partial or broken**: a working subset exists or a visible path is disconnected.
- **Placeholder**: visible UI/content is demonstrative or nonfunctional.
- **Not applicable**: not presented as an existing feature.

| Area | Feature | Status | Evidence / limitation |
|---|---|---|---|
| Public | Homepage and Obsidian Luxe theme | Implemented but not verified | `/` returned 200 and build passed; responsive/visual browser inspection was not run. Homepage has misleading AI-assistance copy and inert category UI described below. |
| Public | Marketplace catalog/search/category/sort | Implemented and verified | Mongo-backed `/marketplace`; source implements filters/sorting/free/paid classification; HTTP 200. Interactive filters need browser QA. |
| Public | Product detail/related products/readiness | Implemented and verified | 7/7 product URLs rendered; active private file existence gates purchase; 7/7 preview associations returned 200. |
| Public | Public preview delivery | Implemented and verified | Preview API only resolves active `isPublic` assets; 7/7 anonymous preview HTTP checks passed. |
| Public | Course catalog | **Partial or broken** | No `/learn` index exists. Navbar “Learning” targets `/marketplace?category=Learning`, but there is no Learning marketplace category/product and it renders an empty result instead of the five public courses. |
| Learning | Course/lesson rendering | Implemented and verified | 5 published public paths, 93/93 lesson URLs returned 200 and contained expected titles. |
| Learning | Markdown/code/table/flowchart rendering | Implemented and verified structurally | All lesson content fields populated; safe renderers exist; real viewport and visual correctness require browser QA. |
| Learning | Server-side quiz grading | Implemented and verified by tests/source | Public props omit `answerIndex` and explanations; authenticated API reloads answers server-side. Actual authenticated submission not performed here. |
| Learning | Visit, completion, attempts, XP, achievements | Implemented but not verified end-to-end | Clerk identity is server-derived, writes are user-scoped, once-only filters exist, and tests pass. Current DB has one progress document; no authorized multi-account browser test in this audit. |
| Learning | Sequential locking/prerequisites | Not applicable / absent | All five courses are public and all published lessons are directly selectable. The model has no course prerequisites or sequential lock field. This is current design, not a broken lock. |
| Learning | Next/previous navigation | Implemented and verified structurally | Generated from ordered published lesson IDs; every target lesson rendered by HTTP. Click/focus behavior needs browser QA. |
| Learning | Admin authoring/autosave/reorder/publish | Partial | Owner checks exist and editor supports these actions. Publishing validates only a title and nonempty markdown, allowing future incomplete lessons to publish without examples, quiz, flowchart, or exercise. |
| Practice | Coding challenge catalog | Implemented and verified | 18 published records; 18/18 pages returned 200; search/filter/status/bookmark implementation and tests exist. |
| Practice | Monaco drafts/bookmarks/practice status | Implemented and verified by tests/source | Clerk-scoped unique records, autosave, language-specific drafts, current-hash practice-pass rules, zero XP. Interactive browser execution was not repeated in this audit. |
| Practice | Python/JavaScript local execution | Implemented but not verified in-browser here | Opaque-origin worker/iframe implementation and public tests exist. Browser-only results are labeled unverified and never create official accepted submissions. |
| Practice | Official Run/Submit grading | **Partial, intentionally disabled** | Judge0 adapter/API security exists, but no trusted runner is configured; official Submit remains disabled and there are zero official submissions. This is fail-closed, not a fabricated grader. |
| Practice | SQL playground | Implemented and verified by tests/source | 25 published SQLite/sql.js challenges; 25/25 pages returned 200; local outcomes are unverified and award 0 XP. Browser execution requires manual QA. |
| Practice | Structured practice tracks | **Partial** | 5 published tracks/47 sections and progress APIs exist. Most added sections contain only ~132–201 characters of explanation, one example, one MCQ, and no challenge link; this does not match the depth of the lesson courses. |
| Practice | Track quiz grading/progress/XP | Implemented but not verified end-to-end | Server-side answers are excluded from public projections; user-scoped attempts and atomic award filters exist. Authenticated browser retry/XP check not run. |
| Account | Clerk sign-in/sign-up/avatar/sign-out | Implemented but not verified interactively | Clerk components and post-sign-out redirect to `/` exist. Browser login/logout session was unavailable. |
| Account | Profile/account management | Implemented via Clerk | Clerk `UserButton` supplies account UI; no separate DevVault profile page is claimed. |
| Dashboard | Unified student dashboard | Implemented but not verified interactively | Server queries are Clerk-scoped and use actual records. Protected-route behavior is tested/source-inspected; current-user presentation needs an authenticated browser. |
| Dashboard | Learning/practice/orders/purchases/submissions | Implemented but not verified interactively | All routes exist and are protected. Submissions empty-state copy is stale. |
| Cart | Persistent cart/drawer/cart page | Implemented and verified by tests/source | Server checkout revalidates products/prices; interactive storage/navigation needs browser QA. |
| Checkout | Stripe-hosted test checkout | Implemented but not re-purchased in this audit | Protected endpoint, server pricing, test-key rejection, order snapshots, metadata, and tests exist. |
| Checkout | Webhook and local reconciliation | Implemented and verified by tests/source | Signature verification, paid-session checks, ownership/amount/currency/PI/session checks, idempotent finalization; real webhook delivery not run. |
| Purchases | Entitlements/private downloads/history | Implemented and verified by tests/storage checks | Entitlement checked on every private download; rate limiter is shared Mongo-backed; 21 remote objects exist. Authorized browser download not run. |
| Admin | Owner-only authorization | Implemented and verified by tests/source | Admin layout, actions, and APIs independently use the server-only owner ID; missing config fails closed. |
| Admin | Product/asset/order/customer/category management | Implemented but not verified interactively | CRUD/readiness/replacement controls exist. Production upload/replacement is deliberately fail-closed until malware scanning is configured. |
| Admin | Coding challenge management | Partial | Create/edit/draft/publish/archive exists, but publish does not require both language starters, private tests, or reference solutions; reference solutions are not managed by the form. |
| Admin | SQL challenge management | Partial | Existing records can be edited/status-changed; UI/actions do not create or manage fixtures, reference query, dialect, or tags. |
| Navigation | Navbar/mobile account links | Implemented but not fully verified | Destinations exist and owner shortcut is capability-gated. Course discovery destination is wrong. |
| Navigation | Footer | **Placeholder** | All 12 grouped links plus Privacy, Terms, and Security use `href="#"` (15 dead links). |
| Navigation | Homepage technology categories | **Placeholder** | “Browse all categories” has no handler; six “View assets” cards are not links. Counts are static catalog copy, not DB counts. |
| Certificates | Certificates | Not applicable | No certificate UI or backing implementation found. |
| Social | Leaderboard/streaks | Not applicable | No leaderboard or streak UI/backing records found. |

## B. Course-by-course content report

### Aggregate database result

| Metric | Result |
|---|---:|
| Published courses | 5 |
| Published lessons | 93 |
| Empty lessons | 0 |
| Structurally incomplete lessons | 0 |
| Code examples | 372 |
| Quiz questions | 372 (exactly 4 per lesson) |
| Flowcharts | 93 |
| Exercises | 93 |
| Duplicate lesson slugs within a course | 0 |
| Placeholder markers in published instructional bodies | 0 |
| Lesson HTTP render checks | 93/93 passed |

All paths have populated title, slug, subject, description, status, access, and modules. **None has a thumbnail because `LearningPath` has no thumbnail/image field at all.** This is a confirmed mismatch with the requested course metadata, not merely missing data.

Quiz validation checked nonempty prompts/explanations, 2–6 nonempty options, an in-range integer answer index, exactly four questions per lesson, and server-only answer handling. It did not independently re-derive all 372 answers from first principles; editorial subject-matter review is still required before representing every answer as independently certified.

### Python Programming — Zero to Advanced

- Slug: `python-zero-to-advanced`
- Modules: 7
- Lessons: 20 published
- Empty/incomplete: 0/0
- Examples/quizzes/flowcharts/exercises: 80 / 80 / 20 / 20
- Instruction body range: 917–3,395 characters
- Broken navigation/resources: none found; 20/20 lesson URLs rendered
- Lesson slugs requiring content fixes: none found by structural audit
- Module inventory: Python Foundations (5), Strings and Collections (3), Functions (2), Intermediate Python (2), Practical Python (3), Object-Oriented Python (2), Advanced and Applied Python (3).

### JavaScript Programming — Zero to Advanced

- Slug: `javascript-zero-to-advanced`
- Modules: 4
- Lessons: 20 published
- Empty/incomplete: 0/0
- Examples/quizzes/flowcharts/exercises: 80 / 80 / 20 / 20
- Instruction body range: 2,039–2,556 characters
- Broken navigation/resources: none found; 20/20 lesson URLs rendered
- Lesson slugs requiring content fixes: none found by structural audit
- Module inventory: JavaScript Foundations (4), Data and Functions (5), Advanced JavaScript (5), Browser and Asynchronous JavaScript (6).

### SQL — Zero to Advanced

- Slug: `sql-zero-to-advanced`
- Modules: 5
- Lessons: 17 published
- Empty/incomplete: 0/0
- Examples/quizzes/flowcharts/exercises: 68 / 68 / 17 / 17
- Instruction body range: 1,985–2,184 characters
- Broken navigation/resources: none found; 17/17 lesson URLs rendered
- Lesson slugs requiring content fixes: none found by structural audit
- Module inventory: Relational Foundations (3), Aggregation and Relationships (3), Advanced Querying (4), Design and Reliability (4), Data Engineering and Interviews (3).

### Data Engineering — Zero to Advanced

- Slug: `data-engineering-zero-to-advanced`
- Modules: 6
- Lessons: 18 published
- Empty/incomplete: 0/0
- Examples/quizzes/flowcharts/exercises: 72 / 72 / 18 / 18
- Instruction body range: 1,731–1,980 characters
- Broken navigation/resources: none found; 18/18 lesson URLs rendered
- Lesson slugs requiring content fixes: none found by structural audit
- Module inventory: Data Engineering Foundations (3), SQL and Warehousing (3), ETL Pipeline Development (3), Python, Pandas and Spark (3), Informatica, Cloud and Orchestration (3), Reliability, Projects and Interviews (3).

### Data Structures and Algorithms — Zero to Advanced

- Slug: `dsa-zero-to-advanced`
- Modules: 6
- Lessons: 18 published
- Empty/incomplete: 0/0
- Examples/quizzes/flowcharts/exercises: 72 / 72 / 18 / 18
- Instruction body range: 1,831–2,121 characters
- Broken navigation/resources: none found; 18/18 lesson URLs rendered
- Lesson slugs requiring content fixes: none found by structural audit
- Module inventory: Algorithm Foundations (3), Arrays and Strings (3), Searching and Sorting (3), Linear Structures (3), Trees, Heaps and Graphs (3), Advanced Interview Patterns (3).

### Learning lifecycle integrity

- Lesson read access is resolved server-side against published path/lesson state and paid entitlement when applicable.
- Public lessons can be read anonymously; authentication is required to save a visit, quiz attempt, or completion.
- Quiz answer keys are removed from page props/HTML and loaded for server grading.
- Attempts and best scores persist in the user-scoped progress document.
- Completion and milestone awards use conditional atomic updates; repeat refresh/submission should not duplicate once-only awards. Automated tests cover these filters.
- Coding/SQL practice XP remains separate and zero.
- Current DB: 1 student learning-progress document. That is insufficient evidence for browser-tested multi-user isolation; implementation and tests cover ownership filters.
- No lesson gating or prerequisite enforcement exists. All current courses are public, so direct lesson navigation is internally consistent with the configured access model.

## C. Practice challenge report

### Coding challenges (Python and JavaScript)

- Actual published challenge records: **18**.
- Language support: **18 Python starters and 18 JavaScript starters** (the same 18 cross-language problems, not 36 unique challenges).
- HTTP render: **18/18 passed**.
- Newer 15 records: three public samples each, starters and internal reference solutions in both languages, server-held private tests, and validation coverage.
- Legacy records `reverse-string`, `two-sum`, and `valid-palindrome`: two public samples and two private cases each, but no persisted `referenceSolutions`, explanation, time-complexity, or space-complexity fields. They remain runnable, but their authoring/validation metadata is incomplete relative to the newer library standard.
- No exact duplicate slug/title was found.
- Local Run executes only public examples in a browser-isolated opaque-origin runner. Results are explicitly unverified; current-source hash matching is required for “Practice Passed · Unverified.”
- Local runs/drafts/bookmarks are authenticated, user-scoped, size-limited/rate-limited, and award zero XP.
- Official Submit is fail-closed while the trusted execution health endpoint is not operational. It does not create accepted submissions or award coding XP. Current official `ChallengeSubmission` count: **0**.
- Admin publish validation is weaker than the seeded library standard and could publish a future record with only one language/sample and without reference/private cases.

### SQL challenges

- Actual published challenge records: **25**.
- Dialect/runtime: SQLite through sql.js in a disposable opaque-origin browser sandbox.
- Each record has three curated fixtures and a private reference query/expected result path; HTTP render **25/25 passed**.
- Queries, local history, and practice status are user-scoped. Browser outcomes are unverified and award zero XP.
- Admin maintenance is partial: fixture/reference-query creation and editing are not exposed in the current UI.

### Structured practice tracks

- Actual: **5 published tracks, 47 published sections, 5 user progress documents**.
- Counts: Python 10, JavaScript 9, SQL 8, DSA 11, Data Engineering 9.
- All sections have a milestone, explanation, at least one example, quiz, and stable ordering.
- Content-depth issue: 43 of the later sections have a single-question quiz; explanations are generally 132–201 characters. Only early sections use two questions. Most sections have no linked challenge, so “Practice challenges” often shows “No challenge is assigned.”
- Six deterministic visualization types are implemented where selected; most sections intentionally have no visualizer.
- Track quiz grading is server-side, records attempts, and uses a separate idempotent XP ledger. This was automated-test/source verified, not authenticated-browser verified.

## D. Marketplace report

### Aggregate result

| Metric | Result |
|---|---:|
| Products | 7 (all currently published) |
| DigitalAsset records | 21 |
| Active private delivery assets | 12 |
| Active public previews | 7 |
| Inactive historical assets | 2 |
| R2 object metadata checks | 21/21 passed (exists, stored size and MIME matched) |
| Product page HTTP checks | 7/7 passed |
| Anonymous public-preview HTTP checks | 7/7 passed |

All current assets use `s3-private`; no published content depends on a host-local delivery path. Product image URLs are remote Unsplash HTTPS URLs; the six unique URLs returned HTTP 200 `image/jpeg` during the audit. Availability remains dependent on that third-party image host.

### Product-by-product inventory

| Product | Price | Active paid deliverables | Public sample | Alignment/result |
|---|---:|---|---|---|
| AI Copilot Workflow Pack (`ai-copilot-workflow-pack`) | ₹6,799 | ZIP (23,947 B), PDF (96,973 B) | PDF (14,652 B) | Remote files valid; ZIP passed integrity with 21 entries. Intended audience and prerequisites are empty, so detail UI admits guidance is not published. |
| Cloud Infra Playbook (`cloud-infra-playbook`) | ₹4,899 | PDF (165,520 B) | PDF (15,825 B) | Remote files valid; metadata populated; structural PDF checks passed. |
| Data Pipeline Patterns (`data-pipeline-patterns`) | ₹5,799 | PDF v1.1 (134,756 B) | PDF v1.1 (15,823 B) | Correct active v1.1 files; inactive v1 PDF and preview retained as two historical assets. |
| Full-Stack Starter Kit (`full-stack-starter-kit`) | ₹6,557 | **Verification PDF (27,412 B), ZIP (67,810 B), guide PDF (85,167 B)** | PDF (14,683 B) | ZIP passed (24 entries). The extra active asset has title `/tmp/devvault-delivery-verification.pdf` and filename `devvault-delivery-verification.pdf`; it is not advertised and looks like a test artifact exposed through entitlements. Investigate before launch. Intended audience/prerequisites empty. |
| Next.js Launch Kit (`nextjs-launch-kit`) | ₹5,499 | ZIP (62,671 B), PDF (78,100 B) | PDF (14,664 B) | Remote files valid; ZIP passed (22 entries). Intended audience/prerequisites empty. |
| Security Review Templates (`security-review-templates`) | ₹4,299 | ZIP (15,843 B), PDF (87,121 B) | PDF (15,872 B) | Remote files valid; ZIP passed (17 entries). |
| TypeScript Systems Blueprint (`typescript-systems-blueprint`) | ₹3,999 | PDF (126,600 B) | PDF (15,319 B) | Remote files valid; structural PDF checks passed. |

PDF structural page-object estimates: Cloud 36/sample 6; Data Pipeline active v1.1 28/sample 6; Data Pipeline inactive v1 29/sample 6; AI 20/sample 5; Full-Stack guide 18/sample 5; Next.js guide 16/sample 5; Security 19/sample 6; TypeScript 27/sample 6. These are **not** a rendered-page quality certification.

### Purchase/delivery integrity

- Checkout re-queries published products and validated active private files, computes INR prices server-side, and rejects unavailable products.
- Order snapshots, Stripe test session/payment identifiers, ownership metadata, amount/currency checks, raw-signature webhook verification, reconciliation, and idempotent finalization exist and are tested.
- Entitlements retain asset IDs; inactive historical records are preserved. Private download authorization validates the signed-in Clerk user and paid entitlement on every request.
- Database counts observed: 4 orders, 3 entitlements, and 8 download records. No record was changed.
- Authorized buyer download, multi-file entitlement download, anonymous paid-download denial, and cross-account denial have automated coverage, but were not exercised through a real Clerk browser session in this audit.
- Homepage featured products do not apply the same readiness test before offering “Add to Cart.” All seven currently have verified active files, so no current product is affected; a storage outage or future unready featured product could enter the cart and be rejected only at checkout.

## E. Dead features and unused UI

1. `src/components/footer.tsx`: 15 visible links use `href="#"`—Marketplace, Learning Lab, Practice Arena, AI Copilot, About, Careers, Partners, Changelog, Docs, Guides, Community, Support, Privacy, Terms, and Security.
2. `src/components/technology-grid.tsx`: “Browse all categories” is a button without an action. Six “View assets” rows are visual text, not anchors/buttons.
3. `src/data/catalog.ts`: `navItems` routes “Learning” to the empty marketplace Learning category instead of the existing courses.
4. `src/components/hero-section.tsx` and `src/data/catalog.ts`: public copy claims “AI assistance” / “AI-powered workflows” / “AI assistance Built in,” but no end-user AI assistant route or API exists. A purchasable AI workflow pack does not make AI assistance built into the platform.
5. `src/app/dashboard/submissions/page.tsx`: empty-state text says Stage 1 has no code execution, although local browser execution now exists. Official secure submission is still correctly unavailable.
6. `src/data/catalog.ts`: unused static `stats`/`quickLinks` include fabricated-looking marketing counts. They are not currently rendered, so this is dead data rather than a live claim.
7. Official coding Submit is visibly disabled pending a trusted runner. This is an intentional security state, not a fake action, but the product is not feature-complete if verified submissions are a launch promise.

## F. Empty or placeholder content evidence

### Public/production-visible

- No published lesson contains audited TODO/TBD/lorem/coming-soon/demo-only/placeholder markers.
- No published marketplace product is empty, but three products have empty intended-audience and prerequisites arrays: `ai-copilot-workflow-pack`, `full-stack-starter-kit`, `nextjs-launch-kit`.
- Full-Stack Starter Kit has a suspicious active asset record titled `/tmp/devvault-delivery-verification.pdf`; exact asset ID is intentionally omitted from this public-facing report, but it is identifiable by title/filename in owner asset management.
- Practice-track section records are populated but several are too short to qualify as substantial guided instruction; this is incomplete depth rather than empty data.

### Authoring-only templates

- `src/app/admin/learning/actions.ts` creates a new draft path with a `Start here` demonstration lesson containing explicit replacement instructions. It is a private owner-authoring template and no such draft is present among the current five published courses.

### Accessibility/quality observations from static inspection

- Several admin and SQL-filter forms rely on placeholder text without associated labels or `aria-label`, including `src/app/admin/categories/page.tsx`, `src/app/admin/orders/page.tsx`, `src/app/admin/assets/page.tsx`, `src/app/admin/products/page.tsx`, and `src/app/practice/sql/challenges/page.tsx`.
- Major tables use horizontal overflow containers and code blocks use horizontal scrolling; responsive CSS exists. Actual touch/keyboard/zoom behavior was not browser-tested.
- Major dashboard, learning, practice, purchases, and admin areas include loading/error/empty states. Coverage is not universal for every form mutation.
- No broken image was observed in HTTP HEAD checks, but remote Unsplash dependency can change independently.

## G. Content publishing and production-data reproducibility

1. The audited records are in the currently configured MongoDB. Repository code alone does not prove that a separate production database contains them.
2. Course scripts are tracked and designed to update by stable path/lesson slugs, but they are split across multiple ordered commands. Python in particular has a foundation plus subsequent lesson scripts; there is no single production content bootstrap/import command.
3. `scripts/seed-devvault.mjs` contains only six products and omits Full-Stack Starter Kit. It also holds older product copy/formats and can overwrite polished fields for matching records. It does not reproduce the current asset records.
4. Full-Stack asset attachment scripts expect the product to already exist; no tracked base-product creation path was found.
5. Current deliverables live in private ignored working directories and Cloudflare R2. A fresh deployment requires a controlled MongoDB content import/restore and the configured private R2 bucket; running generic seeds is not sufficient to recreate the audited production-shaped state.
6. The asset-attachment/generation scripts are operational tooling, not a complete immutable content migration. They must not be casually rerun against production.
7. Practice-track seeding is additive/idempotent by stable slugs and preserves progress identifiers when records already exist, but content depth remains as noted.
8. Course media/attachments are not modeled; flowcharts are stored text definitions. Course thumbnails cannot be populated under the present schema.

## H. Launch-blocking issues and remediation plan

### P0 — security, data loss, inaccessible paid content

No proven P0 defect was found in the audited runtime/data. Private-object existence checks passed 21/21 and authorization paths fail closed. The following must nevertheless be completed as launch-gate verification:

| Issue | Smallest remediation | Estimate |
|---|---|---:|
| Authenticated cross-user/payment/download behavior not exercised in this audit | Run the documented two-account Clerk QA against Stripe test mode and R2: paid buyer, nonbuyer, anonymous, repeat reconciliation/webhook, download history, multi-file entitlement. | 2–4 hours |
| Production upload malware scanning is not operational | Keep production upload/replacement disabled (current fail-closed policy) until a tested quarantine/scanner/release flow exists. | Operational; 1–3 days for provider integration |

### P1 — essential content or feature gaps

| Issue | Evidence | Smallest remediation | Estimate |
|---|---|---|---:|
| Public courses are disconnected from navigation | No `/learn` index; Learning nav points to an empty marketplace category. | Point navigation to an existing course-discovery page after adding a minimal DB-backed index, or intentionally link to `/dashboard/learning` with signed-out handling. | 0.5–1 day |
| Suspicious Full-Stack active verification asset | Active `/tmp/devvault-delivery-verification.pdf` is included in paid entitlement provisioning but not advertised. | Owner reviews contents/history; deactivate only if confirmed test artifact, preserving record and existing historical contract. Then recheck existing entitlements. | 1–2 hours plus buyer-impact review |
| Production content state is not reproducible from one safe tracked process | Six-product seed, current seven-product DB/R2 state, multiple ordered course seeds. | Produce a versioned, dry-run-capable content manifest/import procedure from the audited DB and R2 references; never generic-upsert current production blindly. | 1–2 days |
| Footer presents 15 dead navigation/legal links | All use `#`. | Remove unavailable links or connect only to real routes; legal pages need actual reviewed content before linking. | 2–6 hours excluding legal review |
| Practice tracks are advertised as guided curriculum but most sections are skeletal | 47 sections; most later sections have one short paragraph/example/question and no linked challenge. | Either narrow the claims or complete existing sections with substantive walkthroughs and appropriate challenge links using current schemas. | 3–7 days editorial |

### P2 — UX, wording, quality, and maintainability

| Issue | Smallest remediation | Estimate |
|---|---|---:|
| Course thumbnail requirement cannot be met | Add an optional safe image field only if thumbnails are a real product requirement; otherwise remove thumbnail from launch criteria. | 2–4 hours plus migration/content |
| Homepage category UI is inert | Convert existing cards/button to real filtered marketplace/practice links or render them as noninteractive information without CTA styling. | 2–4 hours |
| AI assistance claims exceed implemented platform behavior | Reword to the real AI workflow product or remove “built in” claims. | <1 hour |
| Three product metadata sections are missing | Populate verified audience/prerequisites through existing owner product editor; do not invent claims. | 1–2 hours editorial |
| Legacy three coding challenges lack reference/explanation/complexity metadata | Add validated reference metadata using existing challenge model/admin tooling; keep IDs/drafts intact. | 3–5 hours |
| Admin challenge publish validation is weaker than library standards | Require both starters, sufficient public/private tests, and internal references before publish; add tests. | 0.5–1 day |
| SQL admin cannot manage complete challenge data | Either document seed-only fixture/reference maintenance or extend existing owner form/actions within current feature. | 0.5–1 day |
| Learning publish allows incomplete lessons | Reuse completeness validators to require examples, valid quiz, flowchart, and exercise before publish. | 3–5 hours |
| Stale submissions copy | Explain that local practice execution exists but verified submissions await the trusted runner. | <1 hour |
| Placeholder-only form labels | Add explicit labels or accessible names to admin/SQL filter controls. | 2–4 hours |
| Featured products can be carted before readiness evaluation | Apply the same readiness projection used on catalog/detail before rendering Add to Cart. | 2–4 hours |
| PDF visual quality not verified in this audit | Render every page to images and inspect blank/clipped pages, bookmarks, TOC, links, and sample isolation. | 2–4 hours |

### P3 — optional post-launch improvements

| Issue | Smallest remediation | Estimate |
|---|---|---:|
| Unused fabricated catalog constants | Delete unused `stats`/`quickLinks` after confirming no consumer. | <1 hour |
| Remote Unsplash product-image dependency | Move approved images to controlled optimized media storage with licenses/provenance. | 0.5–1 day |
| No certificates, leaderboard, or streak system | Keep absent unless separately scoped; do not imply they exist. | Not applicable |
| Official grader unavailable | Retain fail-closed Practice Mode until a trusted, isolated, operational backend is approved. | Separate project |

## Validation results

Commands were run with the installed Node 22.23.4 binary because `package.json` requires `>=22 <23`.

| Check | Result |
|---|---|
| `npm audit --audit-level=low` | Completed; 3 moderate findings in Tailwind 3/PostCSS selector parsing. Only offered fix is a breaking Tailwind 4 upgrade. This is build-time tooling exposure under trusted source input, not a demonstrated runtime exploit, but it remains unresolved. |
| `npm test` | **Passed:** 44 files, 215 tests. Vite emitted a future config-loader warning about ESM syntax in `vitest.config.ts` loaded as CommonJS. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npx next build --webpack` | Passed under Next.js 16.4.2; 41 static/dynamic app routes generated/listed. |
| `git diff --check` | Run after report creation; see final handoff. |

Environment warning: the default shell selected Node **20.16.0**, under which Vitest failed at startup with `ERR_REQUIRE_ESM` from `std-env`. Selecting installed Node **22.23.4** resolved the runner and all tests passed. Deployment and CI must pin/use Node 22 rather than trusting a user-shell default.

## Required manual deployment QA

1. With two real test Clerk accounts, verify sign-in/out, protected redirects, owner-only admin denial, and cross-user isolation.
2. Submit correct/incorrect/repeat quizzes in representative lessons from all five courses; complete lessons; refresh and sign back in; compare dashboard/XP to MongoDB without editing it.
3. Test course/lesson sidebar, next/previous, code scrolling, tables, flowcharts, quiz radios/feedback, focus order, zoom, reduced motion, dark/light themes at mobile/tablet/desktop widths.
4. Run correct/incorrect Python, JavaScript, and SQL local examples; cancel/timeout; confirm draft persistence and zero XP. Confirm official Submit stays disabled.
5. Perform a genuine Stripe **test-mode** checkout, server reconciliation, repeat webhook/reconciliation, paid buyer R2 download, multi-file purchase, download-history insertion, nonbuyer denial, anonymous denial, and rate-limit behavior.
6. Review every rendered marketplace PDF page and ZIP member against product descriptions, especially the Full-Stack verification asset.
7. Confirm production Clerk domains/redirects, Stripe test webhook secret, MongoDB network/least privilege, R2 private policy/CORS, owner ID, rate-limit indexes, malware upload lock, secret rotation, security headers, backups, and recovery drill in the actual deployment environment.

## Representative local URLs

- Homepage: http://localhost:3000/
- Marketplace: http://localhost:3000/marketplace
- Python course: http://localhost:3000/learn/python-zero-to-advanced
- JavaScript course: http://localhost:3000/learn/javascript-zero-to-advanced
- SQL course: http://localhost:3000/learn/sql-zero-to-advanced
- Data Engineering course: http://localhost:3000/learn/data-engineering-zero-to-advanced
- DSA course: http://localhost:3000/learn/dsa-zero-to-advanced
- Coding practice: http://localhost:3000/practice
- SQL practice: http://localhost:3000/practice/sql/challenges
- Practice tracks: http://localhost:3000/practice/tracks
- Student dashboard: http://localhost:3000/dashboard
- Purchases: http://localhost:3000/dashboard/purchases
- Owner learning admin: http://localhost:3000/admin/learning
- Owner product admin: http://localhost:3000/admin/products
- Owner asset admin: http://localhost:3000/admin/assets

No HTTPS deployment URL was verified or invented.
