# Top 10 Usability Wins for Tarangini 2026

**Date:** March 15, 2026
**Purpose:** Identify the highest-impact changes to improve live-event reliability and operator speed.

---

## 1. Safety Guard for "Reset Show" 🛡️
- **Problem:** Tapping "Reset" during a live show is catastrophic and too easy to do by accident.
- **Solution:** Add a "Confirm Reset" modal or a long-press requirement for the Reset (Square) button in the Stage Console.

## 2. Intro Studio Status Banner 🔔
- **Problem:** Operators navigate away while AI backgrounds are generating, losing track of progress.
- **Solution:** Implement a global "Intro Ready" notification or toast that remains visible until dismissed.

## 3. High-Contrast Denominators 📊
- **Problem:** Dashboard cards show "Active" counts but lack context (e.g., "10 Ready" vs "10 Ready out of 100").
- **Solution:** Standardize labels to "X / Y" (e.g., "10 / 100 Cleared") to show absolute progress.

## 4. Performer "Force Ready" Override ⚡
- **Problem:** Technical failures in the AI pipeline can block an act's status even if they are physically on stage.
- **Solution:** Add a Manager-level override to mark an act "Ready for Stage" regardless of asset completion.

## 5. Mobile Filter Wrapping 📱
- **Problem:** Horizontal scrolling for 8+ filters on the Participants page is difficult with one thumb.
- **Solution:** Allow filters to wrap to a second line on small viewports or collapse into a "Type Filter" dropdown.

## 6. Director's Note Condensing 📝
- **Problem:** Large empty spaces for "No technical notes..." push critical buttons (Next/Pause) down.
- **Solution:** Collapse the notes section if empty, showing only a small "+" or "Add Note" icon.

## 7. Organization Selection Guard 🏢
- **Problem:** Data drift between Tarangini (Prod) and ZiffyVolve (Test) orgs causes confusion.
- **Solution:** Make the "Current Organization" name more prominent on the Dashboard (e.g., a colored border or larger text).

## 8. Intro Loading State Polish ⏳
- **Problem:** The Intro Builder has ~7s lag on initialization.
- **Solution:** Use a shimmering skeleton loader instead of a static spinner to give the operator a sense of progress.

## 9. Button Spacing for Heavy Thumbs 🤳
- **Problem:** "Next Performance" and "Pause" buttons are close together on tablet.
- **Solution:** Increase the gap (margin) between primary advancement and secondary controls in the Stage Console.

## 10. Instant Error Diagnostics 🛠️
- **Problem:** CORS or RLS errors (403/404) manifest as "Broken Tiles" with no explanation.
- **Solution:** Add a small "Info" icon to broken tiles that reveals the technical reason (e.g., "Access Denied" or "Missing Link") to help the Manager troubleshoot.
