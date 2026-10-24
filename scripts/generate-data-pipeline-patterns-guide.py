#!/usr/bin/env python3
"""Generate the paid Data Pipeline Patterns guide and its limited public sample.

The generated files belong in DevVault's ignored private-storage tree. This script
contains only original educational source and deterministic validation fixtures.
"""

from __future__ import annotations

import argparse
import io
import sqlite3
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, Preformatted, Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents


BG = colors.HexColor("#09090F")
SURFACE = colors.HexColor("#14111D")
PLUM = colors.HexColor("#211831")
VIOLET = colors.HexColor("#7C3AED")
GOLD = colors.HexColor("#D6B479")
IVORY = colors.HexColor("#F7F2FF")
MUTED = colors.HexColor("#B6A8C6")
BORDER = colors.HexColor("#392B4C")


def validate_examples() -> dict[str, object]:
    db = sqlite3.connect(":memory:")
    db.executescript("""
      CREATE TABLE source_events(id INTEGER PRIMARY KEY,business_key TEXT,value INTEGER,updated_at TEXT);
      INSERT INTO source_events VALUES
        (1,'A',10,'2025-01-01T09:00:00'),(2,'B',20,'2025-01-02T10:00:00'),
        (3,'B',25,'2025-01-02T10:00:00'),(4,'C',30,'2025-01-03T08:00:00');
      CREATE TABLE dim_customer(customer_sk INTEGER PRIMARY KEY,business_key TEXT,tier TEXT,
        valid_from TEXT,valid_to TEXT,is_current INTEGER);
      INSERT INTO dim_customer VALUES
        (101,'C1','Basic','2025-01-01','2025-07-01',0),
        (205,'C1','Pro','2025-07-01',NULL,1),
        (300,'C2','Basic','2025-03-01',NULL,1);
    """)
    controls = db.execute("SELECT COUNT(*),COUNT(DISTINCT business_key),SUM(value) FROM source_events").fetchone()
    incremental = db.execute("""
      SELECT id,business_key,value FROM source_events
      WHERE updated_at > ? OR (updated_at = ? AND id > ?)
      ORDER BY updated_at,id
    """, ("2025-01-02T10:00:00", "2025-01-02T10:00:00", 2)).fetchall()
    latest = db.execute("""
      WITH ranked AS (
        SELECT business_key,value,
               ROW_NUMBER() OVER(PARTITION BY business_key ORDER BY updated_at DESC,id DESC) rn
        FROM source_events
      )
      SELECT business_key,value FROM ranked WHERE rn=1 ORDER BY business_key
    """).fetchall()
    current = db.execute("SELECT business_key,tier FROM dim_customer WHERE is_current=1 ORDER BY business_key").fetchall()
    open_intervals = db.execute("SELECT business_key,valid_to FROM dim_customer WHERE is_current=1 ORDER BY business_key").fetchall()
    db.execute("CREATE TABLE pipeline_target(business_key TEXT PRIMARY KEY,value INTEGER NOT NULL,batch_id TEXT NOT NULL)")
    upsert = """INSERT INTO pipeline_target(business_key,value,batch_id) VALUES(?,?,?)
                ON CONFLICT(business_key) DO UPDATE SET value=excluded.value,batch_id=excluded.batch_id"""
    batch = [("A", 10, "batch-42"), ("B", 25, "batch-42"), ("C", 30, "batch-42")]
    db.executemany(upsert, batch); db.executemany(upsert, batch)
    rerun_state = db.execute("SELECT business_key,value,batch_id FROM pipeline_target ORDER BY business_key").fetchall()
    assert controls == (4, 3, 85)
    assert incremental == [(3, "B", 25), (4, "C", 30)]
    assert latest == [("A", 10), ("B", 25), ("C", 30)]
    assert current == [("C1", "Pro"), ("C2", "Basic")]
    assert open_intervals == [("C1", None), ("C2", None)]
    assert rerun_state == [("A", 10, "batch-42"), ("B", 25, "batch-42"), ("C", 30, "batch-42")]

    rows = [{"id": 1, "amount": 10}, {"id": 2, "amount": -2}, {"id": 3, "amount": 5}]
    valid = [row for row in rows if row["amount"] >= 0]
    rejected = [{**row, "reason": "negative_amount"} for row in rows if row["amount"] < 0]
    assert valid == [{"id": 1, "amount": 10}, {"id": 3, "amount": 5}]
    assert rejected == [{"id": 2, "amount": -2, "reason": "negative_amount"}]
    return {"sqlite_examples": 5, "python_examples": 1, "controls": controls, "incremental": incremental, "latest": latest, "current": current, "open_intervals": open_intervals, "idempotent_rerun": rerun_state}


SECTIONS = [
    {
        "title": "Data Pipeline Architecture and Lifecycle",
        "summary": "A reliable pipeline is a maintained data product, not a one-time copy script. It moves records from an owned source through ingestion, validation, transformation, storage, and serving while preserving meaning, security, lineage, and recovery evidence.",
        "detail": "Begin with the consumer decision the dataset must support. Declare the output grain, source owner, refresh target, retention policy, and failure owner before selecting tools. Separate landing, validation, modeling, and publishing boundaries so a failed batch cannot become visible merely because some rows reached a table. The control plane schedules work and records state; the data plane transports and transforms records. Both need monitoring.",
        "steps": ["Define source and destination contracts.", "Land an immutable or replayable input boundary.", "Validate structure and business rules.", "Transform into a declared target grain.", "Reconcile controls before publication.", "Retain lineage, audit evidence, and a recovery checkpoint."],
        "diagram": ["SOURCE", "INGEST", "LAND", "VALIDATE", "TRANSFORM", "RECONCILE", "PUBLISH"],
        "mistakes": ["Treating a successful scheduler status as proof of correct data.", "Combining extraction, destructive cleanup, and publication in one opaque step.", "Leaving ownership, retention, or recovery undefined."],
        "exercise": "Choose a campus attendance dataset. Write its source owner, row grain, delivery schedule, validation gates, publication boundary, retention rule, and named recovery owner.",
    },
    {
        "title": "Batch, Micro-batch, and Streaming",
        "summary": "Batch processing handles bounded input at planned intervals. Streaming handles an unbounded event sequence and continuously turns it into bounded windows or state updates. Micro-batching offers frequent bounded runs and often provides a simpler operational compromise.",
        "detail": "Choose from a business latency objective rather than fashion. Event time records when the business event occurred; processing time records when the platform observed it. Late and out-of-order events require a watermark, correction window, or explicit rejection rule. Streaming increases the importance of ordering, deduplication, state retention, backpressure, and replay semantics.",
        "steps": ["State acceptable data freshness.", "Estimate volume and burst behavior.", "Choose the simplest mode meeting the objective.", "Define event-time and late-arrival policy.", "Test replay, duplication, and recovery."],
        "diagram": ["EVENTS", "EVENT TIME", "WATERMARK", "WINDOW", "STATE", "OUTPUT"],
        "mistakes": ["Using processing time for business reporting without documenting the difference.", "Choosing streaming for hourly requirements without measuring its operational cost.", "Assuming arrival order equals event order."],
        "exercise": "Compare hourly batch and streaming for payment events. Document latency, cost, ordering, late-data correction, and recovery trade-offs.",
    },
    {
        "title": "ETL versus ELT",
        "summary": "ETL transforms data before loading the serving destination. ELT lands controlled raw or lightly processed data first and applies transformations using destination compute. Neither is universally superior.",
        "detail": "ETL can protect a destination from incompatible or sensitive source fields and can fit specialized transformation engines. ELT preserves source history for reprocessing and uses scalable warehouse or lakehouse compute. In both designs, the landing zone requires access controls, lifecycle rules, schema metadata, and lineage. Transformation placement is a governance and operational decision, not a branding choice.",
        "steps": ["Classify sensitive fields.", "Assess destination compute and cost.", "Define replay requirements.", "Choose transformation placement.", "Apply quality and lineage across every layer."],
        "diagram": ["SOURCE", "CONTROLLED LANDING", "TRANSFORM", "WAREHOUSE", "MART"],
        "mistakes": ["Calling a raw bucket a governed data platform.", "Allowing unrestricted access to landed data.", "Duplicating business rules independently in reports."],
        "exercise": "Design both ETL and ELT versions of an employee payroll feed, then select one based on privacy, replay, scale, and ownership.",
    },
    {
        "title": "Source Contracts and Schema Evolution",
        "summary": "A data contract states what a producer emits and what consumers may rely on: fields, types, keys, nullability, semantic definitions, timestamps, freshness, ownership, and compatibility expectations.",
        "detail": "Schema evolution is not only a parser problem. Adding an optional field is usually safer than renaming or changing the meaning of an existing field, but every change must be evaluated against consumers. Validate incoming schema before expensive processing. Quarantine incompatible batches, alert accountable owners, and retain enough metadata to diagnose the exact producer version without logging sensitive values.",
        "steps": ["Version the contract.", "Classify additive and breaking changes.", "Validate at ingestion.", "Route incompatible input safely.", "Coordinate migration and deprecation."],
        "diagram": ["PRODUCER", "VERSIONED CONTRACT", "SCHEMA GATE", "COMPATIBLE", "CONSUMERS"],
        "mistakes": ["Treating JSON as schema-free.", "Silently converting invalid fields to NULL.", "Renaming fields without a consumer migration period."],
        "exercise": "Define compatibility rules for adding middle_name, changing customer_id from integer to text, and splitting full_name into two fields.",
    },
    {
        "title": "Extraction and Transformation Patterns",
        "summary": "Extraction can use snapshots, ordered keys, timestamps, APIs, database logs, or exported files. Transformation commonly applies validation, normalization, lookup, join, aggregation, routing, and deduplication patterns.",
        "detail": "Bound source work so a pipeline does not overload the operational system. For APIs, persist pagination and rate-limit state. For joins, declare cardinality and decide what happens to unmatched keys. For lookups, define freshness and cache behavior. Aggregations must state their grouping grain. Routers need an explicit default branch so unexpected rows are observable rather than silently lost.",
        "steps": ["Select a repeatable extraction boundary.", "Normalize representation without destroying source evidence.", "Enrich using controlled reference data.", "Validate join cardinality.", "Route valid and rejected outcomes."],
        "diagram": ["BOUNDED READ", "NORMALIZE", "LOOKUP/JOIN", "AGGREGATE", "ROUTE", "WRITE"],
        "mistakes": ["Running unbounded full scans during source peak hours.", "Turning an unexpected many-to-many join into duplicated facts.", "Dropping unmatched lookup rows without a metric."],
        "exercise": "Design an employee extraction that enriches department names, aggregates payroll, and routes missing department keys for review.",
    },
    {
        "title": "SQL Transformations with Verified Results",
        "summary": "Pipeline SQL should use explicit columns, deterministic ordering, stable business keys, and named stages. CTEs make intermediate reasoning reviewable; window functions deduplicate without discarding the detail needed to choose a survivor.",
        "detail": "The fixed source_events fixture contains four rows: A=10, B=20, B=25, and C=30. Its control query returns four rows, three distinct business keys, and a total of 85. A latest-per-key query ordered by timestamp and ID returns A=10, B=25, and C=30. These results were executed against SQLite during document generation.",
        "steps": ["Declare input and output grain.", "Select explicit columns.", "Name stages with CTEs.", "Use deterministic tie-breakers.", "Compare row, key, and value controls."],
        "diagram": ["RAW ROWS", "CTE: CLEAN", "CTE: RANK", "FILTER rn=1", "CONTROL TOTALS"],
        "mistakes": ["Using SELECT * in a durable interface.", "Using ROW_NUMBER without a deterministic final ordering key.", "Checking counts while ignoring control totals."],
        "exercise": "Extend the latest-per-key query to report the discarded version count for every business key.",
        "code": """WITH ranked AS (\n  SELECT business_key, value, updated_at, id,\n         ROW_NUMBER() OVER (\n           PARTITION BY business_key\n           ORDER BY updated_at DESC, id DESC\n         ) AS rn\n  FROM source_events\n)\nSELECT business_key, value\nFROM ranked\nWHERE rn = 1\nORDER BY business_key;\n\n-- Expected rows: (A,10), (B,25), (C,30)""",
    },
    {
        "title": "Incremental Loads and Composite Watermarks",
        "summary": "An incremental load processes only records beyond a committed checkpoint. A timestamp alone is unsafe when several records share the same value, so a stable tie-breaker such as a monotonically increasing ID forms a composite watermark.",
        "detail": "Use a lexicographic predicate: updated_at is later than the saved timestamp, or it equals that timestamp and the ID is greater than the saved ID. Bound the batch, stage its records, validate and merge them, then advance the checkpoint only after the target commit succeeds. Persist the high-water mark from the source ordering, not the local wall clock.",
        "steps": ["Read the committed watermark.", "Extract using timestamp plus ID.", "Stage a bounded batch.", "Validate and merge idempotently.", "Commit data and checkpoint together."],
        "diagram": ["CHECKPOINT", "ORDERED EXTRACT", "STAGE", "MERGE", "VALIDATE", "COMMIT NEW MARK"],
        "mistakes": ["Using only greater-than timestamp and skipping tied rows.", "Advancing a watermark before publication succeeds.", "Using current time instead of the greatest committed source position."],
        "exercise": "Given watermark (2025-01-02T10:00:00, 2), identify the next fixture rows and the new checkpoint.",
        "code": """SELECT id, business_key, value\nFROM source_events\nWHERE updated_at > '2025-01-02T10:00:00'\n   OR (updated_at = '2025-01-02T10:00:00' AND id > 2)\nORDER BY updated_at, id;\n\n-- Expected: (3,B,25), (4,C,30)""",
    },
    {
        "title": "Change Data Capture",
        "summary": "Change Data Capture records inserts, updates, and deletes from a log, change table, trigger, or managed source feature. A usable change event carries the operation, business key, source position, and enough before/after information for the consumer contract.",
        "detail": "Consumers must preserve source ordering within the relevant key or partition and store an acknowledged source position. Deletes require an explicit target policy: hard delete, soft delete, tombstone, or historical expiry. A snapshot plus subsequent log position is a common bootstrap pattern. CDC does not remove the need for data-quality checks or reconciliation.",
        "steps": ["Capture a consistent snapshot and start position.", "Read ordered change envelopes.", "Deduplicate replayed positions.", "Apply inserts, updates, and deletes idempotently.", "Reconcile and checkpoint."],
        "diagram": ["SOURCE LOG", "ORDERED EVENTS", "DEDUPLICATE", "APPLY OPERATION", "ACK POSITION"],
        "mistakes": ["Ignoring deletes.", "Applying an update before its earlier insert.", "Acknowledging source positions before target durability."],
        "exercise": "Design target behavior for insert, update, delete, and an event replay for a customer table.",
    },
    {
        "title": "Idempotency and Safe Reruns",
        "summary": "An idempotent pipeline produces the same intended state when the same bounded input is processed again. It is the foundation of retryable work, because distributed systems can lose acknowledgements even after a write succeeds.",
        "detail": "Choose a stable event or business key. Record batch identity and source position. Prefer merge or upsert semantics that update a known target identity rather than generating a new row on every attempt. Side effects such as notifications require their own deduplication key. Exactly-once claims usually depend on carefully scoped transactional boundaries; design explicitly for at-least-once delivery and idempotent effects.",
        "steps": ["Define stable identity.", "Detect an already-applied input.", "Make target mutations repeat-safe.", "Commit mutation and checkpoint consistently.", "Test crashes before and after commit."],
        "diagram": ["RECEIVE", "IDENTITY CHECK", "APPLY ONCE", "COMMIT", "SAFE REPLAY"],
        "mistakes": ["Creating random target IDs during every retry.", "Assuming a scheduler never duplicates a task.", "Making the table idempotent while duplicating notifications."],
        "exercise": "Write failure-injection cases for a batch that crashes before write, after write, and after commit but before acknowledgement.",
        "code": """INSERT INTO pipeline_target(business_key,value,batch_id)
VALUES ('B',25,'batch-42')
ON CONFLICT(business_key) DO UPDATE SET
  value=excluded.value,
  batch_id=excluded.batch_id;

-- Executed twice against the same three-row batch.
-- Verified final state: exactly A=10, B=25, C=30; no duplicates.""",
    },
    {
        "title": "Rejected Records and Error Handling",
        "summary": "Separate transient infrastructure failures from deterministic data violations and code defects. Transient failures may be retried with bounded exponential backoff and jitter; invalid records should be preserved in a protected rejection store with reason codes and batch context.",
        "detail": "A rejection record needs a safe source identity, reason code, observed schema version, batch ID, and remediation status. Do not log whole sensitive records merely for convenience. Establish thresholds: one invalid optional record may permit publication, while an unexpected schema or a high rejection rate should stop the batch. Reprocessing must avoid duplicating records already corrected.",
        "steps": ["Classify the failure.", "Retry only genuinely transient errors.", "Quarantine deterministic invalid records.", "Alert with safe diagnostic context.", "Correct, replay, and reconcile."],
        "diagram": ["VALIDATE", "VALID", "PUBLISH", "INVALID", "QUARANTINE", "REMEDIATE"],
        "mistakes": ["Retrying invalid rows forever.", "Logging personal data in error messages.", "Publishing after an unexplained rejection spike."],
        "exercise": "Create reason codes and actions for missing key, invalid amount, incompatible schema, timeout, and permission failure.",
        "code": """rows = [{\"id\": 1, \"amount\": 10},\n        {\"id\": 2, \"amount\": -2},\n        {\"id\": 3, \"amount\": 5}]\nvalid = [r for r in rows if r[\"amount\"] >= 0]\nrejected = [{**r, \"reason\": \"negative_amount\"}\n            for r in rows if r[\"amount\"] < 0]\nprint(valid)\nprint(rejected)\n# Expected: IDs 1 and 3 valid; ID 2 rejected""",
    },
    {
        "title": "Data Quality and Validation",
        "summary": "Data quality is measurable fitness for an intended use. Common dimensions include completeness, uniqueness, validity, consistency, timeliness, and referential integrity.",
        "detail": "Translate each expectation into a named test with an owner, threshold, severity, and response. Profile baselines before setting thresholds. A zero-tolerance primary-key rule differs from an alert-only distribution drift check. Validate at several boundaries so failures can be localized: after extraction, after transformation, and before publication.",
        "steps": ["Define quality rules from contracts.", "Measure baseline behavior.", "Assign thresholds and severity.", "Block or warn according to policy.", "Record trends and remediate root causes."],
        "diagram": ["CONTRACT", "RULES", "MEASURE", "THRESHOLD", "BLOCK/WARN", "TREND"],
        "mistakes": ["Collecting metrics without ownership.", "Treating every rule as equally severe.", "Allowing NULLs introduced by failed joins to pass as valid."],
        "exercise": "Define six measurable quality rules for an orders dataset and state whether each blocks publication.",
    },
    {
        "title": "Source-to-Target Reconciliation",
        "summary": "Reconciliation compares independent controls at pipeline boundaries to establish that the intended data arrived and transformed consistently. A green job status alone is insufficient evidence.",
        "detail": "Useful controls include raw row count, distinct business-key count, accepted and rejected counts, sums of stable numeric measures, minimum and maximum timestamps, and partition-level hashes. Expected differences must be explained by transformation rules. Store controls with batch identity and compare them before advancing the publication marker.",
        "steps": ["Capture source controls.", "Account for filtering and rejection.", "Capture target controls.", "Explain every expected delta.", "Block publication on unexplained differences."],
        "diagram": ["SOURCE CONTROLS", "TRANSFORM RULES", "TARGET CONTROLS", "COMPARE", "PUBLISH/HOLD"],
        "mistakes": ["Comparing only row counts.", "Calculating source and target controls from the same incorrect table.", "Accepting differences without an auditable explanation."],
        "exercise": "Create a reconciliation equation for 1,000 source rows, 12 valid rejections, and 988 target rows, then add key and amount controls.",
        "code": """SELECT COUNT(*) AS rows,\n       COUNT(DISTINCT business_key) AS unique_keys,\n       SUM(value) AS control_total\nFROM source_events;\n\n-- Verified expected result: rows=4, unique_keys=3, control_total=85""",
    },
    {
        "title": "Audit Columns, Logging, and Observability",
        "summary": "Audit columns describe processing lineage: source system, source position, ingestion time, batch ID, pipeline version, and update time. Logs explain discrete events; metrics describe trends; traces connect work across services.",
        "detail": "Record enough context to answer which code processed which source boundary into which target version. Avoid credentials, tokens, and raw sensitive values. Core metrics include input, valid, rejected, written, and duplicate counts; freshness lag; duration; retry count; checkpoint position; and publication state. Alerts need an owner and a runbook, not only a threshold.",
        "steps": ["Choose safe lineage fields.", "Emit structured stage events.", "Measure counts, latency, and freshness.", "Correlate by batch ID.", "Attach alerts to owners and runbooks."],
        "diagram": ["PIPELINE STAGES", "LOGS + METRICS", "BATCH ID", "ALERT", "RUNBOOK"],
        "mistakes": ["Logging secrets or complete customer payloads.", "Monitoring compute success but not data freshness.", "Alerting without a responsible responder."],
        "exercise": "Design an audit table and five alerts for a daily customer pipeline without storing sensitive payloads.",
    },
    {
        "title": "Failure Recovery and Retry Design",
        "summary": "Recovery returns the platform to a verified state from a known checkpoint. Retries are bounded responses to classified transient failures, not a substitute for understanding the cause.",
        "detail": "Use exponential backoff with jitter to avoid synchronized retry storms. Set attempt and elapsed-time limits, then move to a failed state requiring intervention. Publishing should be atomic or use a versioned pointer so consumers never see a partial target. Recovery steps should identify the last committed boundary, correct the cause, replay idempotently, reconcile, and only then republish.",
        "steps": ["Detect and classify failure.", "Stop unsafe publication.", "Locate the last committed checkpoint.", "Retry transient work within limits.", "Repair and replay.", "Reconcile before republishing."],
        "diagram": ["FAIL", "CLASSIFY", "BOUNDED RETRY", "REPAIR", "REPLAY", "RECONCILE"],
        "mistakes": ["Infinite retries.", "Manual target edits without audit evidence.", "Republishing before reconciliation completes."],
        "exercise": "Write a runbook for a timeout, a schema break, and a partially written target partition.",
    },
    {
        "title": "Slowly Changing Dimensions: Types 1 and 2",
        "summary": "Type 1 overwrites an attribute and retains only the latest value. Type 2 expires the current dimension version and inserts a new surrogate-keyed version so historical facts retain their original context.",
        "detail": "The business key identifies the entity across versions; the surrogate key identifies one historical version. Use an explicit interval convention such as valid_from inclusive and valid_to exclusive. Expire and insert in one transaction. Validate that an active entity has exactly one current row and that intervals never overlap. Facts should resolve to the version valid at the event time.",
        "steps": ["Compare staged and current attributes.", "Choose overwrite or history preservation.", "For Type 2, expire the current row.", "Insert a new surrogate version.", "Validate current-row count and interval overlap."],
        "diagram": ["DETECT CHANGE", "TYPE 1: UPDATE", "OR", "TYPE 2: EXPIRE", "INSERT VERSION", "VALIDATE"],
        "mistakes": ["Using Type 1 when historical reporting is required.", "Joining all historical facts to the current dimension row.", "Creating overlapping Type 2 intervals."],
        "exercise": "Model a customer moving from Basic to Pro on 2025-07-01 using both Type 1 and Type 2, and explain the reporting difference.",
        "code": """SELECT business_key, tier\nFROM dim_customer\nWHERE is_current = 1\nORDER BY business_key;\n\n-- Verified expected: (C1,Pro), (C2,Basic)""",
    },
    {
        "title": "Architecture Case Study: Employee Data ETL",
        "summary": "A daily employee pipeline extracts a consistent snapshot, validates identity and salary, enriches department details, routes invalid rows, calculates payroll controls, and publishes only after reconciliation.",
        "detail": "The target grain is one current employee per employee_id. Source controls include snapshot ID, row count, unique employee count, and total salary. Missing IDs and invalid salaries are quarantined. Department lookups are many-to-one and unmatched keys are rejected or held according to policy. The target and audit record commit together; the publication pointer changes only after controls match.",
        "steps": ["Capture snapshot boundary.", "Validate key, salary, and dates.", "Enrich department with cardinality checks.", "Route rejections.", "Merge target and audit controls.", "Publish atomically."],
        "diagram": ["HR SNAPSHOT", "VALIDATE", "DEPT LOOKUP", "VALID/REJECT", "MERGE", "RECONCILE"],
        "mistakes": ["Summing salary after duplicated department joins.", "Dropping rejected employees without notice.", "Publishing before source totals are recorded."],
        "exercise": "Specify schema, five rules, lookup behavior, audit controls, and recovery for a 50,000-row employee snapshot.",
    },
    {
        "title": "Architecture Case Study: Incremental Customer Load",
        "summary": "An incremental customer pipeline consumes ordered changes, deduplicates replayed source positions, validates the business key, compares tracked attributes, and applies current-state or historical changes safely.",
        "detail": "Use the source log sequence or composite watermark as the extraction boundary. Stage before mutation so the batch can be profiled and replayed. Collapse multiple changes for a business key only when the contract permits losing intermediate states. For Type 2, retain meaningful versions in order. Handle deletes explicitly and commit the target changes with the new checkpoint.",
        "steps": ["Read committed source position.", "Stage ordered changes.", "Deduplicate exact replays.", "Validate and classify changes.", "Apply Type 1 or Type 2 rules.", "Reconcile and checkpoint."],
        "diagram": ["CDC/WATERMARK", "STAGE", "ORDER + DEDUPE", "COMPARE", "APPLY HISTORY", "CHECKPOINT"],
        "mistakes": ["Collapsing events when intermediate history matters.", "Losing delete events.", "Using destination update time as the source checkpoint."],
        "exercise": "Trace insert, two updates, a duplicated event, and a delete for one customer through the full pipeline.",
    },
    {
        "title": "Common Implementation Mistakes",
        "summary": "Most serious pipeline failures come from unclear contracts, unstable identity, unsafe state transitions, and weak evidence rather than from syntax errors.",
        "detail": "Warning signs include timestamp-only watermarks, nondeterministic deduplication, blind retries, unbounded source reads, many-to-many joins, checkpoints committed too early, sensitive error logs, missing delete handling, and dashboards that monitor tasks rather than delivered data. Review failure paths before optimizing the happy path.",
        "steps": ["Review contracts and grains.", "Challenge every identity and ordering assumption.", "Inject duplicate, late, malformed, and missing input.", "Crash around commit boundaries.", "Verify reconciliation and recovery evidence."],
        "diagram": ["ASSUMPTION", "FAILURE INJECTION", "OBSERVE", "CORRECT DESIGN", "REGRESSION TEST"],
        "mistakes": ["Equating orchestration success with dataset correctness.", "Optimizing before correctness is measurable.", "Allowing manual repair to become the normal path."],
        "exercise": "Audit an existing pipeline against the checklist and rank findings by data-loss, duplication, privacy, and recovery risk.",
    },
    {
        "title": "Data Engineering Interview Questions",
        "summary": "Strong interview answers define assumptions, explain trade-offs, and describe failure behavior. Memorized definitions are less valuable than a coherent design that preserves correctness under retries and changing data.",
        "detail": "Practice explaining: ETL versus ELT; batch versus streaming; composite watermarks; idempotency; CDC delete handling; data-quality dimensions; reconciliation; star-schema grain; surrogate versus business keys; Type 1 versus Type 2; partitioning; retry limits; and pipeline observability. For design questions, state source, scale, latency, contract, target grain, security, failure policy, and recovery evidence.",
        "steps": ["Clarify functional and non-functional requirements.", "State data grain and identity.", "Draw stages and state boundaries.", "Explain quality, security, observability, and cost.", "Walk through failure and replay."],
        "diagram": ["REQUIREMENTS", "CONTRACT", "DESIGN", "FAILURE PATH", "TRADE-OFFS", "EVIDENCE"],
        "mistakes": ["Naming tools without explaining why they fit.", "Ignoring deletes, late data, or backfills.", "Claiming exactly-once processing without defining its boundary."],
        "exercise": "Design a daily sales pipeline, then explain how the design changes for five-minute freshness and late-arriving refunds.",
    },
    {
        "title": "Revision Checklist and Glossary",
        "summary": "Use this chapter before implementation reviews, production releases, and interviews. A complete design makes boundaries, ownership, evidence, and recovery explicit.",
        "detail": "Checklist: declare source and target grain; define keys and ordering; version the contract; bound extraction; classify late data and deletes; make retries idempotent; separate valid and rejected records; validate quality; reconcile independent controls; protect secrets; emit safe observability; commit checkpoints only after success; document recovery; test backfills; and assign owners. Glossary terms include batch, stream, event time, watermark, CDC, checkpoint, idempotency, grain, lineage, reconciliation, SCD, surrogate key, quarantine, and backfill.",
        "steps": ["Review design checklist.", "Explain each glossary term in your own words.", "Apply concepts to a case study.", "Test failure boundaries.", "Record remaining assumptions."],
        "diagram": ["CONTRACT", "PROCESS", "CONTROL", "EVIDENCE", "RECOVERY", "OWNER"],
        "mistakes": ["Using terminology without a precise boundary.", "Leaving assumptions implicit.", "Treating documentation as separate from operational readiness."],
        "exercise": "Create a one-page design review for a pipeline of your choice and answer every checklist item with measurable evidence.",
    },
]


INTERVIEW_QA = [
    ("Why is a timestamp-only watermark unsafe?", "Multiple records can share the same timestamp. A stable tie-breaker prevents skipping or repeating records at the boundary."),
    ("What makes a pipeline idempotent?", "Stable input identity plus repeat-safe target effects ensure replaying the same bounded input does not create unintended additional state."),
    ("When should a checkpoint advance?", "Only after target writes, validation, and publication state have committed successfully."),
    ("How does CDC differ from a periodic incremental query?", "CDC consumes an ordered change stream including operations such as deletes; an incremental query derives changes from source columns and may not retain every intermediate event."),
    ("What is fact-table grain?", "The precise business event represented by one fact row. It must be declared before measures and dimensions are selected."),
    ("Why use a surrogate key in a Type 2 dimension?", "It uniquely identifies a historical version while the business key connects every version of the same entity."),
    ("What should a reconciliation compare?", "Independent row, key, rejection, control-total, time-boundary, and optionally hash controls, with every expected difference explained."),
    ("How should transient and deterministic failures differ?", "Transient faults may receive bounded retries; deterministic invalid data should be quarantined or the batch stopped until corrected."),
    ("What is the difference between event time and processing time?", "Event time is when the business event occurred; processing time is when the pipeline observed or handled it."),
    ("Why can a successful scheduler run still deliver bad data?", "The scheduler proves task execution, not semantic correctness, completeness, uniqueness, freshness, or reconciliation."),
]


class ProcessFlow(Flowable):
    def __init__(self, labels, width=170*mm, height=28*mm):
        super().__init__(); self.labels=labels; self.width=width; self.height=height
    def draw(self):
        c=self.canv; n=len(self.labels); gap=3*mm; box=(self.width-gap*(n-1))/n
        for i,label in enumerate(self.labels):
            x=i*(box+gap); c.setFillColor(PLUM); c.setStrokeColor(VIOLET); c.roundRect(x,5*mm,box,15*mm,2*mm,fill=1,stroke=1)
            c.setFillColor(IVORY); c.setFont("Helvetica-Bold",5.8); c.drawCentredString(x+box/2,12*mm,label[:18])
            if i<n-1:
                c.setStrokeColor(GOLD); c.line(x+box,12.5*mm,x+box+gap,12.5*mm)
                c.line(x+box+gap-2,12.5*mm,x+box+gap-4,14*mm); c.line(x+box+gap-2,12.5*mm,x+box+gap-4,11*mm)


class GuideDoc(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, **kw)
        frame=Frame(self.leftMargin,self.bottomMargin,self.width,self.height,id="content")
        self.addPageTemplates(PageTemplate(id="guide",frames=frame,onPage=self.page_art))
    def page_art(self, canvas, doc):
        canvas.saveState(); canvas.setFillColor(BG); canvas.rect(0,0,A4[0],A4[1],fill=1,stroke=0)
        canvas.setStrokeColor(BORDER); canvas.line(20*mm,15*mm,A4[0]-20*mm,15*mm)
        canvas.setFillColor(MUTED); canvas.setFont("Helvetica",8)
        canvas.drawString(20*mm,9*mm,"DevVault  |  Data Pipeline Patterns")
        canvas.drawRightString(A4[0]-20*mm,9*mm,f"{doc.page}")
        canvas.restoreState()
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name in ("Chapter","H2"):
            level=0 if flowable.style.name=="Chapter" else 1
            text=flowable.getPlainText(); key=f"h{level}-{self.seq.nextf('heading')}"
            self.canv.bookmarkPage(key); self.canv.addOutlineEntry(text,key,level=level,closed=False)
            self.notify("TOCEntry",(level,text,self.page,key))


def styles():
    s=getSampleStyleSheet()
    return {
        "title": ParagraphStyle("TitleLuxe",parent=s["Title"],fontName="Helvetica-Bold",fontSize=30,leading=35,textColor=IVORY,alignment=TA_LEFT,spaceAfter=10*mm),
        "subtitle": ParagraphStyle("Subtitle",parent=s["Normal"],fontSize=13,leading=20,textColor=MUTED,spaceAfter=7*mm),
        "chapter": ParagraphStyle("Chapter",parent=s["Heading1"],fontName="Helvetica-Bold",fontSize=22,leading=27,textColor=IVORY,spaceAfter=5*mm),
        "h2": ParagraphStyle("H2",parent=s["Heading2"],fontName="Helvetica-Bold",fontSize=14,leading=18,textColor=GOLD,spaceBefore=4*mm,spaceAfter=2*mm),
        "body": ParagraphStyle("Body",parent=s["BodyText"],fontSize=9.8,leading=14,textColor=IVORY,spaceAfter=2.5*mm),
        "small": ParagraphStyle("Small",parent=s["BodyText"],fontSize=8.5,leading=12,textColor=MUTED,spaceAfter=2*mm),
        "bullet": ParagraphStyle("BulletLuxe",parent=s["BodyText"],fontSize=9.3,leading=13,textColor=IVORY,leftIndent=5*mm,firstLineIndent=-3*mm,spaceAfter=1.2*mm),
        "code": ParagraphStyle("Code",fontName="Courier",fontSize=6.7,leading=8.5,textColor=IVORY,leftIndent=3*mm,rightIndent=3*mm,spaceBefore=1.5*mm,spaceAfter=2*mm,backColor=SURFACE,borderColor=BORDER,borderWidth=.5,borderPadding=5),
        "toc0": ParagraphStyle("TOC0",fontName="Helvetica-Bold",fontSize=10.5,leading=16,textColor=IVORY,leftIndent=0,firstLineIndent=0),
        "toc1": ParagraphStyle("TOC1",fontName="Helvetica",fontSize=9,leading=13,textColor=MUTED,leftIndent=8*mm,firstLineIndent=0),
    }


def bullet(text, st): return Paragraph(f"<font color='#D6B479'>•</font> {text}", st["bullet"])


def cover(st, sample=False):
    label="PUBLIC SAMPLE" if sample else "PROFESSIONAL STUDY GUIDE"
    return [Spacer(1,28*mm),Paragraph("DATA PIPELINE<br/>PATTERNS",st["title"]),Paragraph("Reliable architecture, incremental processing, quality, recovery, and warehouse history",st["subtitle"]),Spacer(1,12*mm),Table([[label],["DevVault Educational Series"],["SQLite and Python examples validated with deterministic local fixtures"],["Edition 1.0  |  October 2026"]],colWidths=[160*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,0),VIOLET),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,0),10),("BACKGROUND",(0,1),(-1,-1),PLUM),("TEXTCOLOR",(0,1),(-1,-1),IVORY),("FONTNAME",(0,1),(-1,-1),"Helvetica"),("FONTSIZE",(0,1),(-1,-1),10),("LEADING",(0,0),(-1,-1),16),("BOX",(0,0),(-1,-1),1,BORDER),("INNERGRID",(0,0),(-1,-1),.25,BORDER),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)])),Spacer(1,12*mm),Paragraph("Original educational material developed from DevVault's completed Data Engineering, SQL, and Python curricula. Vendor and cloud concepts are explanatory; no managed cloud, Spark, or Informatica workflow is claimed as executed.",st["small"]),PageBreak()]


def chapter_story(section, number, st):
    out=[Paragraph(f"{number:02d}  {section['title']}",st["chapter"]),Paragraph(section["summary"],st["body"]),Paragraph(section["detail"],st["body"]),Paragraph("Process model",st["h2"]),ProcessFlow(section["diagram"]),Paragraph("Implementation sequence",st["h2"])]
    out += [bullet(x,st) for x in section["steps"]]
    if section.get("code"):
        out += [Paragraph("Validated example",st["h2"]),Preformatted(section["code"],st["code"])]
    out += [Paragraph("Common mistakes",st["h2"])] + [bullet(x,st) for x in section["mistakes"]]
    out += [Paragraph("Hands-on exercise",st["h2"]),Table([[Paragraph(section["exercise"],st["body"])]],colWidths=[165*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,-1),PLUM),("BOX",(0,0),(-1,-1),1,GOLD),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)])),PageBreak()]
    return out


def build_pdf(path: Path, sample=False):
    st=styles(); story=cover(st,sample)
    if not sample:
        story += [Paragraph("Contents",st["chapter"])]
        toc=TableOfContents(); toc.levelStyles=[st["toc0"],st["toc1"]]; story += [toc,PageBreak()]
        story += [Paragraph("How to use this guide",st["chapter"]),Paragraph("Read Chapters 1-5 for architectural foundations, Chapters 6-15 for implementation controls, Chapters 16-17 for end-to-end designs, and Chapters 18-20 for review and interview preparation. Run examples only in a controlled development database. Adapt dialect-specific merge, transaction, timestamp, and constraint behavior to the database you operate.",st["body"]),Paragraph("Validation scope",st["h2"]),Paragraph("The SQLite queries and pure Python transformation in this guide were executed against fixed local fixtures during generation. Architecture diagrams, cloud services, Spark, and Informatica descriptions are conceptual and were not executed by this generator.",st["body"]),PageBreak()]
        for i,section in enumerate(SECTIONS,1): story += chapter_story(section,i,st)
        story += [Paragraph("Interview answer key",st["chapter"])]
        for q,a in INTERVIEW_QA: story += [Paragraph(q,st["h2"]),Paragraph(a,st["body"])]
        story += [PageBreak(),Paragraph("Final revision sheet",st["chapter"]),Paragraph("Before a pipeline is ready, be able to point to its source contract, grain, identity, ordering, checkpoint, idempotency rule, rejection policy, quality thresholds, reconciliation evidence, security boundary, observability, publication boundary, recovery runbook, and accountable owner.",st["body"]),ProcessFlow(["CONTRACT","GRAIN","IDENTITY","QUALITY","RECOVERY","OWNER"])]
    else:
        story += [Paragraph("What this sample includes",st["chapter"]),Paragraph("This limited sample contains three introductory chapters from the complete twenty-chapter paid guide. It demonstrates the writing, diagrams, exercises, and technical level without including implementation chapters, case studies, interview answers, or the final revision material.",st["body"]),PageBreak()]
        for i,section in enumerate(SECTIONS[:3],1): story += chapter_story(section,i,st)
        story += [Paragraph("Continue with the complete guide",st["chapter"]),Paragraph("The paid guide continues with source contracts, SQL transformations, incremental loads, CDC, idempotency, rejection handling, quality, reconciliation, observability, recovery, SCD patterns, case studies, interview preparation, and a revision checklist.",st["body"])]
    doc=GuideDoc(str(path),pagesize=A4,rightMargin=20*mm,leftMargin=20*mm,topMargin=20*mm,bottomMargin=22*mm,title="Data Pipeline Patterns",author="DevVault",subject="Data engineering study guide")
    doc.multiBuild(story)


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--output-dir",type=Path,required=True); args=parser.parse_args()
    result=validate_examples(); args.output_dir.mkdir(parents=True,exist_ok=True)
    full=args.output_dir/"data-pipeline-patterns-study-guide-v1.1.pdf"; sample=args.output_dir/"data-pipeline-patterns-public-sample-v1.1.pdf"
    build_pdf(full,False); build_pdf(sample,True)
    print({"full":str(full),"sample":str(sample),"validation":result})


if __name__ == "__main__": main()
