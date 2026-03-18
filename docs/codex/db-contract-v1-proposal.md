# InOutHub Backend Contract V1: Auth, Sessions & Profiles

## 1. Overview
This contract defines the administrative backbone for staff operations. It provides a high-integrity record of *who* is on board, *when* they were active, and *where* (event/org context) they are currently operating.

---

## 2. Identity & Profile Model (`user_profiles`)
*Baseline: Matches `auth.users` via existing trigger.*

| Column | Type | Source | Rationale |
| :--- | :--- | :--- | :--- |
| `id` | UUID PK | Server | Matches `auth.users.id`. |
| `phone_number` | TEXT | Client | Critical for on-site coordination. |
| `timezone_pref`| TEXT | Client | Default: `America/New_York`. |
| `metadata` | JSONB | Client | UI preferences (theme, density). |

---

## 3. Auth Lifecycle history (`auth_events`)
*Append-only chronicle of security events.*

| Column | Type | Source | Rationale |
| :--- | :--- | :--- | :--- |
| `id` | UUID PK | Server | Unique event trace ID. |
| `user_id` | UUID FK | Server | Link to `user_profiles`. |
| `event_type` | TEXT | Server | `magic_link_requested`, `login_completed`, `logout`. |
| `ip_address` | TEXT | Server | **Trustworthy**: Injected by Supabase/LB. |
| `user_agent` | TEXT | Server | **Trustworthy**: Injected via Request Headers. |
| `created_at` | TIMESTAMPTZ | Server | Immutable timestamp. |

---

## 4. Operational Presence (`user_sessions`)
*The "Pulse" of the application. Not just a heartbeat, but a stateful record of a staff member's work session.*

| Column | Type | Source | Rationale |
| :--- | :--- | :--- | :--- |
| `id` | UUID PK | Server | App-level session ID (distinct from Auth token). |
| `user_id` | UUID FK | Server | Staff identity. |
| `active_event_id`| UUID FK | Client | **Scoping**: Links session to a specific Event Workspace. |
| `status` | TEXT | Server | `active`, `stale`, `timed_out`, `ended`. |
| `pwa_version` | TEXT | Client | **Client-Reported**: Version of the code being run. |
| `device_info` | JSONB | Client | **Client-Reported**: OS, Browser, Screen Size. |
| `is_offline_mode`| BOOLEAN | Client | **Client-Reported**: Current network state from PWA. |
| `started_at` | TIMESTAMPTZ | Server | Session creation time. |
| `last_active_at`| TIMESTAMPTZ | Server | Updated via operation or heartbeat. |
| `ended_at` | TIMESTAMPTZ | Server | Populated on explicit logout or timeout logic. |

---

## 5. Administrative Scoping & RLS
### The "Visibility Hook"
Sessions and Auth Events are **Global** entities (users exist across orgs), but visibility is **Contextual**:

- **Event Scoping**: `user_sessions` includes `active_event_id`. An `EventAdmin` for Event A will only see sessions where `active_event_id == Event A`.
- **RBAC Logic**: 
  - `EventAdmin` / `StageManager`: Can `SELECT` sessions/events for staff linked to their event (via existing `event_members` check).
  - `app_super_admins`: Global visibility across all tables.
  - **Self-Read**: Deferred for V1. Staff do not need to read their own logs; these are administrative tools.

---

## 6. Capture Model: Magic-Link Flow
Sharpened definitions for the InOutHub behavior:

1. **`magic_link_requested`** (Server): Logged when the Auth API receives an OTP/Link request.
2. **`login_completed`** (Server): Logged when the session is initialized (profile check passes).
3. **`session_timeout`** (Mixed): 
   - *Internal*: Defined as a session with no activity for > 60 minutes.
   - *Audit*: Marked `timed_out` by a background cleanup handler or when a stale user returns with an invalid token.
4. **`session_restored`** (Client): Logged when the PWA re-hydrates a session from `localStorage` without requiring a new login.

---

## 7. App Telemetry
*Status: **DEFERRED to V1.1***
*Case for Deferral*: InOutHub already has a comprehensive `audit_logs` system (Gate 17) tracking every row change in Acts, Participants, and Lineups. Creating a separate telemetry table in V1 would duplicate these signals. 

---

## 8. Open Questions & Risks
- **Identity Collision**: If a user has two tabs open on different Events, we must decide if that is one `user_sessions` row with the "Latest" context or two distinct `id`s. **Recommendation**: Multiple `id`s (tab/device scoped) for accurate offline tracking.
- **Heartbeat Density**: We recommend a 1-minute heartbeat for active users in the Stage Console, and 5-minutes elsewhere.
