# Tarangini 2026 Error & Edge-Case Catalog

**Date:** March 15, 2026
**Goal:** Anticipate and document failure modes to prevent live-event panic.

---

## 1. Network & Connectivity (PWA Resilience)

| Failure Mode | Symptom | Mitigation / Recovery |
| :--- | :--- | :--- |
| **Total Offline** | "Offline Mode" badge appears in Console. | PWA cache allows viewing current lineup; "Status Update" queued for sync. |
| **Intermittent Sync** | "Status Picker" shows loader but doesn't change. | UI to show "Unsynced Changes" count. DO NOT refresh browser. |
| **CDN Delay** | Intro photos show "Broken" icon. | `BrokenAssetTile` logic prevents crash; Operator plays audio-only or skip. |

---

## 2. Data State & Missing Fields

| Edge Case | Problem | Operational Workaround |
| :--- | :--- | :--- |
| **Zombie Act** | Act in Lineup with 0 participants. | Manager removes from Lineup; Operator skips if encountered. |
| **Orphan Asset** | Asset approved but Participant withdrawn. | System hides; if in intro, `IntroVideoBuilder` shows "Retired Performer". |
| **Late Import** | New Google Sheet batch arrives mid-show. | Sync guarded. Sync only possible in "Maintenance Mode" (Pre-Show). |

---

## 3. Intro Studio & AI Pipelines

| Failure Mode | UI Behavior | Resolution |
| :--- | :--- | :--- |
| **Safety Block (LLM)** | "Intro Error: Prompt Review required." | Simplify Director's notes (remove creative/weird words) and Regen. |
| **Timeout (Imagen)** | "Generation still processing" (Info Banner). | Wait 30s; refresh Intro Workspace. |
| **Empty Selection** | Builder has no photos to select. | Manager must "Approve" at least 1 photo in Participant Profile first. |

---

## 4. Stage Console Logic

| Edge Case | Impact | Remedy |
| :--- | :--- | :--- |
| **Double Tap "Next"** | Skips an entire act in the lineup. | Use the "Reset Show" or manually pick the previous act from Lineup View. |
| **Act Reordering mid-Live** | Current "Next Up" might change abruptly. | Operator must confirm reorder notification before Console updates stack. |
| **Intro Play mid-Act** | Accidentally triggering Intro while act is 2m in. | `IntroVideoPlayer` has a clear "Close/X" button for immediate exit. |

---

## 5. Mobile / Tablet Friction

| Issue | Observation | UX Fix (Cutline Ref) |
| :--- | :--- | :--- |
| **Sticky Scroll** | Modal background scrolls instead of content. | High-priority CSS fix for `overflow-y-auto`. |
| **Mis-Click "Reset"** | Resetting show state clears progress. | Add "Confirm Reset" modal. |
| **Low-Contrast** | Text hard to read in bright outdoor stage-entry. | Dark Mode with High-Contrast Primary buttons. |

---

## Critical Troubleshooting Sequence for Operators

1. **Check Badge**: Is it Green (Verified) or Red (Disconnected)?
2. **Reload Page**: Only if "Unsynced Changes" is zero.
3. **Toggle Status**: Try marking the next act "Ready" to test connectivity.
4. **Contact Manager**: Use the Guardian Phone numbers (hidden behind Manager role) if emergency arises.
