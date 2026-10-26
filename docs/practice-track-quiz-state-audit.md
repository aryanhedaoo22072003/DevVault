# Practice track quiz-state and completion audit

Audit date: 2026-10-26. MongoDB was read only. Persisted counts below are the number of user-scoped progress records containing each quiz ID; no user IDs, answers, XP, or progress records were printed or changed.

## Authoritative policy

A published section is completed when its own server-graded knowledge-check quiz ID exists in that Clerk user's `completedQuizIds`. Section 1 is initially available. Section N is available only after every earlier published section quiz is complete. Associated coding challenges are supplemental for every current track: they do not complete or block a section, do not require Judge0, and unverified local runs never create accepted submissions or XP.

The track page, quiz API, visit API, track catalog, and dashboard all calculate knowledge progress from these same quiz IDs. The quiz and visit APIs derive the owner from Clerk and enforce ordering independently of the UI.

## Published-track inventory

Notation: `Q` = question count, `C` = associated challenge count, `P` = progress records with this quiz completed. Every row is achievable through its server-graded knowledge check.

### Data Engineering Fundamentals (9 sections; 2 progress records)

1. ETL versus ELT — Q1/C0/P2
2. Pipeline design — Q1/C0/P2
3. Data warehousing — Q1/C0/P2
4. Star schemas — Q1/C0/P2
5. Incremental loads and SCD Type 2 — Q1/C0/P2
6. Data quality controls — Q1/C0/P2
7. SQL transformations — Q1/C0/P2
8. Pipeline orchestration — Q1/C0/P2
9. Production pipeline patterns — Q1/C0/P2

Data Engineering's existing 100% quiz-only completion remains valid.

### Python Problem Solving (10 sections; 2 progress records)

1. Reasoning with strings — Q2/C1/P2
2. Collections and lookups — Q2/C1/P2
3. Lists and traversal — Q1/C0/P1
4. Dictionaries and frequency maps — Q1/C1/P1
5. Sets and uniqueness — Q1/C0/P1
6. Functions and contracts — Q1/C0/P1
7. Recursion and base cases — Q1/C0/P1
8. Searching — Q1/C0/P1
9. Sorting and keys — Q1/C0/P1
10. Practical problem-solving patterns — Q1/C0/P1

### JavaScript Problem Solving (9 sections; 2 progress records)

1. String transformations — Q2/C1/P2
2. Normalization and two pointers — Q2/C1/P2
3. Arrays and two pointers — Q1/C0/P0
4. Objects and keyed records — Q1/C0/P0
5. Functions and transformations — Q1/C0/P0
6. Maps and sets — Q1/C0/P0
7. Callbacks and pipelines — Q1/C0/P0
8. Recursion and the call stack — Q1/C0/P0
9. Algorithmic reasoning — Q1/C0/P0

Both current JavaScript progress records have sections 1 and 2 completed, so section 3 is achievable and must be unlocked. Section 4 correctly waits for section 3's quiz.

### SQL Problem Solving (8 sections; 1 progress record)

1. Filtering rows — Q1/C0/P1
2. Joins — Q1/C0/P1
3. Aggregation — Q1/C0/P1
4. GROUP BY and HAVING — Q1/C0/P1
5. Subqueries — Q1/C0/P0
6. Common table expressions — Q1/C0/P0
7. Window functions — Q1/C0/P0
8. SQL interview patterns — Q1/C0/P0

### DSA & Interview Preparation (11 sections; 2 progress records)

1. Hash-map patterns — Q2/C1/P1
2. Two-pointer patterns — Q2/C2/P1
3. Arrays and strings — Q1/C0/P0
4. Sliding window — Q1/C0/P0
5. Binary search — Q1/C0/P0
6. Sorting tradeoffs — Q1/C0/P0
7. Stacks — Q1/C0/P0
8. Queues — Q1/C0/P0
9. Linked lists — Q1/C0/P0
10. Trees and traversal — Q1/C0/P0
11. Introductory dynamic programming — Q1/C0/P0

## Quiz-state repair

App Router reused `TrackQuiz` when a search-parameter navigation changed the section. The component's one-time state initializer therefore retained the old positional answers and result. The repair wraps the stateful quiz in a component keyed by a stable identity derived from track slug, section slug, and the current question IDs. Navigating sections remounts only the quiz state, clearing unsaved answers, feedback, errors, and loading state without changing persisted completion.

Submission serializes exactly the active question IDs in their displayed order. Empty, partial, or duplicate-ID quizzes fail locally. Visit requests are aborted on navigation. A monotonically increasing request version prevents a response belonging to an unmounted/previous quiz from updating current state. Historical `initialComplete` displays only the saved completion badge; it does not invent old selections or feedback.

## Browser verification

A real headless Chrome session against the local production build selected both answers in JavaScript section 1, navigated client-side to section 2, and observed the correct section 2 title, two current questions, zero checked options, zero old feedback, and no alert. Browser Back returned to section 1 with zero checked options and zero old feedback. This verifies forward/back state isolation without mutating a user account.

Authenticated submission, refresh, logout/login, once-only XP, and two-account isolation still require authorized browser sessions after deployment. Automated tests cover answer ordering/validation, sequential unlock calculation, owner scoping, failed scoring, optional challenges, and the atomic duplicate-XP predicate.
