# Coding runner and practice progression audit

Audit date: 2026-10-26. No progress, XP, challenge, payment, or asset records were modified.

## Runner findings

The deployed runner document returned both its dedicated sandbox CSP and the global `X-Frame-Options: DENY`. The global CSP also supplied `frame-ancestors 'none'`. Those headers prevented DevVault from embedding its own hidden runner document, so its `ready` message never reached `useBrowserRunner` and **Run Locally** remained disabled.

The fix excludes only `/devvault-browser-runner.html` from the global anti-frame rule. Its dedicated policy now permits only a same-origin ancestor while retaining `sandbox allow-scripts`, `default-src 'none'`, a blob-only worker, the exact jsDelivr runtime origin, no forms, no objects, and no nested frames. The React iframe still has `sandbox="allow-scripts"` without `allow-same-origin`, so executed code receives an opaque `null` origin and cannot access Clerk cookies, application storage, or private same-origin APIs.

Runner initialization now reports a visible failure after 8 seconds and offers a sandbox retry. JavaScript and SQL retain a 10-second execution ceiling. Python receives a finite 30-second ceiling because a cold Pyodide download/initialization can legitimately exceed 10 seconds; stopping or timing out replaces the iframe/worker while preserving the editor draft.

Supported local runtimes are Python (Pyodide), JavaScript (classic disposable Web Worker), and read-only SQLite (sql.js). TypeScript, C, C++, and Java remain unavailable. The official Judge0 adapter remains fail-closed because all Judge0 environment variables are absent. Local runs remain unverified and award zero XP.

A genuine headless Chrome smoke run against the production build executed:

- JavaScript Reverse String: expected and actual `"tluaVveD"`, passed.
- Python Reverse String through Pyodide: expected and actual `"tluaVveD"`, passed.
- SQLite `COUNT(*)` over two fixed rows: returned column `total` and row `2`.

The live site was inspected before the fix and returned `X-Frame-Options: DENY` on the byte-identical runner asset. The fixed response was verified locally; it has not been deployed.

## Progression findings

Every published section has a server-graded knowledge check. Track completion is based only on the ordered quiz IDs in `PracticeTrackProgress.completedQuizIds`. Coding challenges are optional reinforcement and are not a prerequisite. Existing progress showed two different user-scoped JavaScript records, each with the first two quiz IDs completed; this is expected user isolation, not duplication.

The stale progression defect was client synchronization: after a successful quiz write, `TrackQuiz` showed local feedback but did not refresh the App Router server component. Its progress bar/sidebar/navigation therefore retained the pre-submit record until a later reload. The quiz handler also did not explicitly revalidate affected pages.

The repair refreshes after a persisted passing result, revalidates track/dashboard paths, and enforces the same ordered prerequisite rule in the page, quiz API, and visit API. A direct request cannot skip earlier checks. Failed quizzes do not unlock anything. Repeats remain safe: completion uses `$addToSet`, and XP retains the existing atomic once-only ledger predicate.

Sections without challenges now state that their knowledge check is the completion requirement instead of implying missing content.

## Python section associations

| Order | Section ID | Section | Quiz | Challenges | Completion / satisfiable |
|---:|---|---|---|---:|---|
| 1 | `6adb122214723a8a7e2aa461` | Reasoning with strings | `python-strings-check` (2 questions) | 1 | Pass quiz; yes |
| 2 | `6adb122214723a8a7e2aa462` | Collections and lookups | `python-lookups-check` (2) | 1 | Pass quiz after section 1; yes |
| 3 | `6adb156e14723a8a7e2aa499` | Lists and traversal | `lists-and-traversal-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 4 | `6adb156e14723a8a7e2aa49a` | Dictionaries and frequency maps | `dictionaries-check` (1) | 1 | Pass quiz after earlier checks; yes |
| 5 | `6adb156e14723a8a7e2aa49b` | Sets and uniqueness | `sets-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 6 | `6adb156e14723a8a7e2aa49c` | Functions and contracts | `functions-and-contracts-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 7 | `6adb156e14723a8a7e2aa49d` | Recursion and base cases | `recursion-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 8 | `6adb156e14723a8a7e2aa49e` | Searching | `searching-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 9 | `6adb156e14723a8a7e2aa49f` | Sorting and keys | `sorting-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 10 | `6adb156e14723a8a7e2aa4a0` | Practical problem-solving patterns | `problem-solving-patterns-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |

## JavaScript section associations

| Order | Section ID | Section | Quiz | Challenges | Completion / satisfiable |
|---:|---|---|---|---:|---|
| 1 | `6adb122214723a8a7e2aa464` | String transformations | `javascript-strings-check` (2 questions) | 1 | Pass quiz; yes |
| 2 | `6adb122214723a8a7e2aa465` | Normalization and two pointers | `javascript-pointers-check` (2) | 1 | Pass quiz after section 1; yes |
| 3 | `6adb156e14723a8a7e2aa4a1` | Arrays and two pointers | `arrays-and-two-pointers-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 4 | `6adb156e14723a8a7e2aa4a2` | Objects and keyed records | `objects-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 5 | `6adb156e14723a8a7e2aa4a3` | Functions and transformations | `functions-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 6 | `6adb156e14723a8a7e2aa4a4` | Maps and sets | `maps-and-sets-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 7 | `6adb156e14723a8a7e2aa4a5` | Callbacks and pipelines | `callbacks-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 8 | `6adb156e14723a8a7e2aa4a6` | Recursion and the call stack | `recursion-js-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |
| 9 | `6adb156e14723a8a7e2aa4a7` | Algorithmic reasoning | `algorithmic-reasoning-check` (1) | 0 | Pass quiz after earlier checks; yes, no challenge required |

## Manual post-deployment checks

1. Confirm the runner response has no `X-Frame-Options` and has `frame-ancestors 'self'`.
2. Run Recursive Digit Sum in Python after a cold cache, retry once after deliberately blocking jsDelivr, and verify the detailed readiness error.
3. Run a JavaScript challenge and SQL query; stop an infinite JavaScript loop and confirm the draft remains saved.
4. With an authenticated test user that has sections 1–2 passed, open JavaScript section 3, pass its actual quiz, confirm section 4 unlocks immediately, refresh, then sign out/in and confirm persistence.
5. Submit an incorrect section quiz and confirm the next section remains locked. Repeat a passed quiz and confirm no duplicate XP ledger entry.
6. Repeat with a second user and confirm no progress crosses accounts.

No authenticated progression records were created or changed during this audit.
