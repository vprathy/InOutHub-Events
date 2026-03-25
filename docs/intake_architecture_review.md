# Intake Architecture Review: Reliability, Scale, and Safety

## 1. Executive Summary
The InOutHub intake architecture is reasonably strong for pilot operations but still has reliability and scale risks under poor connection quality or very large datasets. The lineage-first design (`import_runs`) and idempotency shields (unique constraints) are significant strengths.

Important distinction:
- some safeguards in this document are already implemented
- others remain recommendations for later work

Implemented now:
- participant browser upload hard limit: 2,000 rows
- interactive Google Sheet sync hard limit: 5,000 rows
- duplicate-row warning heuristic
- `src_raw` truncation guardrail
- import-run lineage and audit foundations

Still recommended, not yet implemented:
- expanded import status state machine
- background queueing
- destructive restart / rollback UX

---

## 2. Recommended Safeguards

### Category: Connection & Network Reliability
*   **Granular States (Recommended):** Expand `import_runs.status` to include `processing` (DB writes started) and `finalizing` (logs being written) only if we also tighten the write path around those states.
*   **Polling Loop:** The client can poll `import_runs` to surface recent activity and stale runs. This is now partially reflected in the intake UI.
*   **Stale Detection:** Any run stuck in `running` for > 15 minutes can be flagged in the UI as stale. That does not mean restart/destructive recovery is automatically safe.

### Category: Scaling & Thresholds
*   **Enforce Limits:**
*   **Local Processing:** Block local spreadsheet uploads > 2,000 rows. This is now implemented.
*   **Edge Functions:** Block interactive syncs > 5,000 rows to prevent execution timeouts (60s). This is now implemented for participant Google Sheet sync.
*   **Chunked Upserts (Recommended):** Instead of processing 5,000 rows in one array, process in chunks of 500 to keep database lock duration short and memory usage low.

### Category: Data Integrity & Operator Safety
*   **Deletion Sensitivity (Recommended):** Any import resulting in a large proportion of `missing_from_source` records should require explicit operator review before a future destructive rollback/finalization flow.
*   **Unique Data Check:** Add pre-flight validation for duplicates *within* the import file (not just against the DB). A heuristic warning is now implemented.
*   **Raw Data Capping:** Limit the size of `src_raw` to prevent massive, hidden metadata from bloating the database. A basic truncation guardrail is now implemented.

---

## 3. Recommended Import State Machine

| State | Definition | Retriable? | Recovery Action |
| :--- | :--- | :--- | :--- |
| `running` | Parsing/Assessment started. Current Phase 1 state. | **YES** | Safe to retry only after checking whether the prior run actually completed or failed. |
| `processing` | DB `upsert` in progress. | **NO** | Must check if record count changed before restart. |
| `finalizing` | Audit/Lineage records being written. | **NO** | High potential for metadata drift if interrupted. |
| `succeeded` | Complete. | **NO** | View stats in UI. |
| `failed` | Explicit error caught. | **YES** | View error log, adjust, retry. |
| `blocked` | Pre-flight rules failed. | **YES** | Correct mappings, retry. |

Note:
- `processing` and `finalizing` are still recommended states, not part of the current schema contract.

---

## 4. Scale Thresholds (Interactive Flow)

| Metric | Soft Limit | Hard Limit | Reasoning |
| :--- | :--- | :--- | :--- |
| **Row Count (Local)** | 1,500 | 3,000 | Browser memory/lockup protection. |
| **Row Count (Edge)** | 2,000 | 5,000 | Edge Function 60s execution limit. |
| **Column Count** | 30 | 100 | SQL performance and `src_raw` bloat. |
| **Concurrent Runs** | 1 per Event | 2 per Org | Row lock contention prevention. |

---

## 5. Next Steps vs Phase 2

### Immediate (Phase 1 Cleanup)
1. Normalize the backend-to-frontend intake outcome contract so operators clearly see success, warnings, blocked states, and failures.
2. Verify the recent sync activity UI against real import runs and stale-run behavior.
3. Keep destructive restart / rollback behavior out of the UI until dependency checks and recovery semantics are explicitly defined.

### Structural (Phase 2)
1. **Supabase Queues:** Move intake to an asynchronous job queue for reliability.
2. **Delta Sync:** Implement client-side diffing to only upload changed rows.
3. **Audit Hardening:** Move `src_raw` to a cold storage or compressed JSONB partition if audit history grows too large.
