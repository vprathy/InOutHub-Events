# Operational Roadmap & Validation Gates

We validate progress through 4 end-to-end operational gates. Completion of a gate signifies a tactical milestone ready for live event pilot testing.

---

## 🟢 Gate 3: Show Flow (Verified)
*Schedule building, conflict detection, and duration orchestration.*
- [x] Implement mobile-first drag-and-drop act reordering
- [x] Implement "Conflict Detection" logic (e.g. back-to-back performer gaps)
- [x] Build conflict visual indicators on lineup cards
- [x] Implement multi-stage flow scanning logic
- [x] Total show duration and setup overhead calculator

## 🟢 Gate 4: Live Execution (Verified)
*Stage Manager console, real-time pace tracking, and show advancement.*
- [x] Transform console into tactical "Now -> Next -> After" stack
- [x] Implement "Schedule Drift" detection and delay alerts
- [x] Build explicit Stage State controls (Queued -> Backstage -> Live)
- [x] Implement Advance/Next show controls with debounced safety
- [x] Final "Show Simulation" E2E verification

---

## 🟢 Gate 5: PWA Transition (Initial Setup Complete)
*Manifest-driven offline resilience and background sync.*
- [x] Install and configure `vite-plugin-pwa`
- [x] Define the `manifest.webmanifest` (Icons, Theme, Splash)
- [x] Implement Offline Asset Pre-caching for Active Events
- [ ] Add Service Worker for Background State Sync

## 🟡 Gate 6: Generative Asset Pipeline (Phased Production Integration)
*Phased validation of Vertex AI and asset persistence.*

### Stage 1: Vertex Connectivity ✅
- [x] Design Vertex AI API integration layer (Nano, Veo, Lyria)
- [x] Implement Production Edge Function (jose JWT + Google OAuth2)
- [x] Hard-code bucket reference to `participant-assets`
- [x] Log specific Vertex AI response status
- [x] Implement Silent Failure (return `isPending: true` on Safety Block)
- [x] Resolve "Cinematic Preview" Modal confusion (Dynamic titles)
- [x] Transition to Two-Stage Pipeline (Gemini LLM -> Imagen 3.0)
- [ ] Implement Demo Fallback Asset (Use placeholder if safety block persists)
- [x] Front-End: Add "Reviewing for Brand Safety" UI state for pending assets
- [x] Verify graceful failure on controversial prompts (e.g. "danger" or "violence" keywords)
- [x] Finalize Walkthrough with "Brand Safety" demo proof

### Stage 2: Asset Persistence ✅
- [x] Configure Supabase Storage buckets for AI assets
- [x] Implement asset upload and act_requirements linking in Edge Function
- [x] Verify persistence and public URL accessibility

### Stage 3: Console Rendering (Needs Revalidation)
- [x] Create `ActIntroOverlay` high-fidelity component
- [x] Integrate theatrical overlay into `LivePerformanceController` (Initial wiring)
- [ ] Build `ActGenerativeControls` for manual prompt overrides

## 🟢 Gate 7: Show Flow & Stage Console (Verified)
*Critical path for live event execution.*
- [x] Refactor Live Console for PWA reliability (Offline-ready states)
- [x] Implement "Next Act" auto-preparedness logic (Media Prefetching)
- [x] Connect Generative Assets to Stage Console UI (Posters/Videos)
- [x] Add Connectivity Status Badge (Live vs Offline monitoring)

---

- [x] Wire Status Dropdown to `useUpdateParticipantStatus`
- [x] Create `EditParticipantModal` component
- [x] Add `useResolveNote` and `useDeleteAsset` hooks
- [x] Wire Resolve Note and Delete Asset buttons
- [x] Comprehensive UI/UX Refinement
    - [x] **Closing the Generative Loop** (Demo Critical)
      - [x] Edge Function: Transform connectivity test to full asset pipeline
        - [x] Integrate Vertex AI (Imagen 3) for Cinematic performance poster generation
        - [x] Implement image processing (extract base64 data)
        - [x] Persist to Supabase Storage (`performance-assets` bucket)
        - [x] Link asset to Database (`act_requirements` table with `Generative` type)
        - [x] Create detailed "Input-Process-Output" workflow documentation (v16 GA Spec)
      - [x] Database: Modify `act_requirements` check constraint for `'Generative'` type
      - [x] Frontend: Update `ParticipantProfilePage.tsx`
        - [x] Implement rendering of AI-generated posters in Assets tab
        - [x] Replace modal notification with user-friendly Toast ('AI Intro Assets Ready')
        - [x] Fix duplicate state/imports and lint errors
      - [x] Technical Verification: End-to-end test of the AI Suggest pipeline
    - [x] Consolidate top headers (badges row) on ParticipantProfilePage
    - [x] Reduce 'Vertical Deserts' on all core screens
    - [x] Implement swipable secondary tabs for mobile
    - [x] Polish typography (antialiased, tracking-wider labels)
    - [x] Refine card/container proportions (p-8 to p-4, rounded-lg)
    - [x] Implement responsive button stacking
    - [x] **Final Validation**
    - [x] Document non-productive credit burn (~78 credits)
    - [x] Confirm STOP on all generative branding activities
- [x] **Gate 11: AI Optimizer & Stable Diffusion 4.0**
    - [x] Upgrade `generate-act-assets` to use `imagen-4.0-fast-generate-001`
    - [x] Verify model connectivity and output quality
- [x] **Gate 12: v16 GA Spec Refinement (March 2026)**
    - [x] Transition to native `:generateImages` endpoint
    - [x] Implement flattened request payload structure
    - [x] Configure `block_only_high` safety shield
    - [x] Enable `allow_all` person generation for performers
    - [x] Final mobile-first polish on BottomNav
    - [x] Audit `ParticipantProfilePage` for button height & overlap (Tablet/Mobile)
    - [x] Harmonize bottom navigation/button styling (App-wide)
    - [x] Ensure "Mobile-First" design across core screens
- [x] **Gate 12.1: v16.1.2 Schema & Trust Refinement**
    - [x] Align Imagen payload with `personGeneration` and `bytesBase64Encoded`
    - [x] Disable `enhancePrompt` to prevent double-processing
    - [x] Implement `x-inouthub-trust` guardrail
    - [x] Deploy and verify v26 in Ohio origin
- [x] **AI Handover logic (Vertex AI + Gemini Engineering)**
    - [x] Implementation of Stage 1: Gemini 1.5 Flash "Prompt Engineer" logic
    - [x] Implementation of Stage 2: Imagen 3.0 Generation logic
    - [x] Silent Failure Mechanism (Graceful handle for 400/429 errors)
    - [x] Deploy updated Edge Function (v14 Stable)
- [x] AI Suggest Logic Refinement
    - [x] Update button label/icon when act is verified
    - [x] Verify assignment → regenerate flow
    - [x] Update `handleAiSuggest` to handle structured content
    - [x] Stabilize UI Banner (persistent until dismissed)
- [x] Expand Edit Participant Modal
    - [x] Add Status, Identity Verified, Minor toggle, and Guardian fields
    - [x] Wire state properly to handle changes
- [x] Audit App Layout & Regressions
    - [x] Restore Scrolling (`overflow-hidden` fix)
    - [x] Fix Audit Log date formatting
    - [x] Verify Asset rendering (Templated vs Ad-hoc)
- [x] **Gate 13: Vertex AI Path Resolution (Completed) ✅**
    - [x] Stop browser agent usage to conserve credits
    - [x] Switch to backend/shell probing for Vertex URL isolation
    - [x] Resolve 404 error through direct API verification
    - [x] Finalized production model deployment (v23 Stable)
- [x] Definitive Backend Verification ✅
    - [x] Verify Victor Barrows' full profile integrity (via DB/Logs)
    - [x] Test Edit Modal changes → Audit Log consistency (via DB)
    - [x] Verify AI Suggest Vertex integration (via Logs)
### Audit Log & Profile UI Polish ✅
- [x] Fix Audit Log "Invalid Date" bug (property mapping)
- [x] Implement detailed diffs (from -> to) for Operational Accountability
- [x] Adjust AI banner visibility for mobile bottom nav clearance
- [x] Standardize Edit Modal note labels (Internal vs Stage Coordination)
- [ ] **Gate 14: Multimedia AI Breakthrough (Veo & Audio)**
    - [x] Configure Google Cloud Text-to-Speech (`en-US-Studio-O`).
    - [x] Implement Audio generation and storage flow.
    - [x] Verify Audio MP3 generation in production (Backend Pilot Verified).
    - [x] Build "Intro Video Builder" (Template-based assembly)
      - [x] Template-Based Intro Video Builder
    - [x] Backend: Implement "Abstract Background" mode in Edge Function (v34)
    - [x] Backend: Implement "Curation AI" loop (Gemini 2.5 Vision)
    - [x] Frontend: Create `IntroVideoBuilder` assembly component
    - [x] Frontend: Integrate Intro Builder into Act Workspace (Verified)
    - [x] Persistence: Store assembled intro composition (IntroComposition)
    - [x] Review: Admin approval and "Approved" vs "Draft" badges
    - [x] Resolve Vercel build failure (TypeScript `upsert` type mismatch)
    - [x] Final E2E Verification of Intro Builder persistence

## 🟢 Gate 8: Audit Remediation (Gap Closing)
*Closing critical gaps identified in the demo-readiness audit.*
- [x] Implement **Unified Operational Header** (Consolidated badges strip)
- [x] Refactor Secondary Nav into **Swippable Cockpit Tabs**
- [x] Implement smooth touch-momentum scrolling for mobile cockpit
- [x] Final surgical polish on `PerformanceProfilePage.tsx` proportions
- [x] Fix Asset Preview with secure URL support

## 🟢 Gate 9: Iron-Clad Final Fixes
*Emergency fixes for regressions identified just before demo.*
- [x] Audit and fix `ParticipantProfilePage.tsx` tag balance
- [x] Restore Tab Nomenclature (OVERVIEW, PERFORMANCES, etc.)
- [x] Correct Cinematic Preview bucket name
- [x] Implement Silent PWA (`skipWaiting`, `clients.claim`)
- [x] Surface Cinematic Poster Thumbnail in the header strip
- [x] **App Versioning & Premium Startup**
    - [x] Expose `VITE_APP_VERSION` from `package.json`
    - [x] Build kinetic `SplashScreen` component
    - [x] Integrate startup sequence with smooth exit animation

## 🟡 Gate 15: Intro System MVP (Needs Revalidation)
### Gate 15: Intro System MVP (Generative Loop) & Studio Revalidation
- [x] **Backend Freshness**: Verified `intro-capabilities` v4 (2026-03-18) is live and handles curation/composition correctly.
- [x] **Data Alignment**: Seed data for `The strong Solo Singer` verified with 3+ approved photos and linked audio.
- [x] **Manual UI Loop**: **VERIFIED PASS** (2026-03-18).
  - Reset -> Prepare -> Preview -> Approve -> Console loop completed.
  - Success: `IntroComposition` (v2026-03-18) persisted with correct asset IDs and audio preference.
  - Audio check: Uploaded act audio correctly prioritized over generated TTS.
  - Stage Console: `PLAY INTRO` button active and reflective of approved state.
  - **Worktree Update**: The project has moved to the canonical `main` branch worktree at `/Users/vinay/dev/InOutHub-Events-main`. All further rollout and polish must happen in this tree.

### Gate 17: Intro Builder UX Overhaul (Premium Polish)
- [x] **Studio Layout**: Intro Builder integrated as primary Act Workspace tab with glassmorphism UI.
- [x] **Validation Guards**: UI prevents preparation if no approved participant photos exist (Verified).
- [ ] **Cinematic Storyboard / Playback**: Full cinematic storyboard preview and custom timing verification pending next-gen logic.
- [x] **CORS / Trust-Headers**: Cross-origin pipeline calls verified with `x-inouthub-trust`.

---

## Technical Debt & Infrastructure (Continuous)
- [x] Universal Mobile/Tablet UX Standardization (UXG-001)
- [x] Dashboard Readiness Radar & Compliance summary
- [x] Performance Workspace (Deep-dive routes)
- [x] Supabase operational field hardening

## Current Next Work
- [x] Complete OTP-first pilot validation on mobile browser and installed PWA flow.
- [x] Apply `supabase/migrations/20260319_expand_auth_events_metadata.sql` to the live Supabase project before relying on enriched auth telemetry.
- [x] Align `supabase/migrations/20260320_fix_access_role_ambiguity_and_enable_act_requirement_bridge.sql` with the corrected live Supabase apply behavior.
- [x] Validate the Access admin workflow on the local app, including pending grants, role updates, and manual deletion refresh behavior.
- [ ] Gate 17: verify cinematic storyboard / playback timing polish for the approved intro path.
- [ ] Validate the new workspace-selection flow on device:
  - `select-org`
  - `select-event`
  - long-name truncation
  - edit affordances
  - create org / create event affordances
- [ ] Validate the refactored Dashboard on mobile:
  - phase-aware top metrics
  - MECE Response Queue behavior
  - single-open category expansion
  - 2-row compactness across queue surfaces
  - return-focus from `Special Requests` back from participant profile
- [ ] Requirements workflow review and phase-2 roadmap capture:
  - keep participant requirements limited to actual admin-defined obligations, not inbound participant requests
  - keep performance requirements limited to `Music File`, `Intro Approved`, and `Team Manager Assigned`
  - unify `requirement_policies`, `requirement_assignments`, and file/template surfaces so participant and performance profiles stop relying on hybrid bridge logic
  - define whether phase 2 replaces `asset_templates` outright or formalizes a canonical bridge contract
- [ ] Verify dashboard RBAC by role:
  - admin full view
  - event-ops constrained view
  - limited/member view
- [ ] Continue the Phase 1 mobile operator rehearsal across:
  - `Admin > Access`
  - `Admin > Requirements`
  - participant/performance requirement visibility
  - `Show Flow`
  - `Live Console`
- [ ] Define and validate the Phase 1 people model for manual entry:
  - clarify whether crew/support lives in the same event people roster as participants
  - ensure manual add captures the minimum metadata needed to avoid cast-vs-crew drift
  - keep manual-entry language and affordances consistent with the chosen people model
- [ ] Keep signed-in account profile work disabled for now; do not reintroduce profile confirmation/update UX unless explicitly prioritized again.

## UI / UX Hardening In Progress
- [ ] Keep implementation aligned to the agreed surface design; do not redesign while wiring.
- [ ] Keep Dashboard top metrics and Response Queue MECE; never duplicate the same concept in both.
- [ ] Keep Response Queue and its expanded rows to the agreed mobile compactness rules.
- [ ] Use named participant/act rows in the queue where possible instead of vague aggregate cards.
- [ ] Standardize header, sticky strip, and bottom nav as the shared shell container across surfaces.

### Card & Pill Density Overhaul (Potential Improvements)
> Audit: ~300–600px of recoverable vertical scroll per page from over-containerized UI.

- [ ] **Kill helper text in production UI** — remove product-philosophy sentences rendered as badges/subtitles across Performance Profile, Lineup, Dashboard (~200px recovery)
- [ ] **Replace OperationalMetricCard grids on profiles with inline text** — metric cards (min-h-[88px] each) should only appear on Dashboard; profile/list pages use `Label: value` inline (~176px recovery per page)
- [ ] **Flatten ActCard mini-grid** — replace 3 bordered Cast/Music/Prep sub-cards with one text line: `4 cast • Music ready • 2 to review` (~80px per card × N acts)
- [x] **Inline ActionMenu** — remove the standalone participant-profile action row; keep `Edit Profile` in the shell strip and local overflow actions inline
- [ ] **Remove redundant PageHeader subtitles** — drop subtitle strings that repeat data already visible in metric cards or filter pills below (~20px per page)
- [ ] **Eliminate surface-panel double nesting** — cards-inside-panels on Dashboard, Lineup, Participants add border-on-border noise + ~22px padding overhead each
- [ ] **Downgrade pills-as-labels to plain text** — static descriptive text ("No Change", Cast/Music/Prep labels) should not wear `rounded-full border bg-` styling; reserve pills for interactive counts and live status
- [ ] **Compact OperationalEmptyResponse** — "No Active Issues" currently costs 72px in a padded card with a padded icon container; reduce to a single muted text line
- [ ] **Reduce filter pill height** — min-h-11 filter buttons with nested count sub-pills can become min-h-9 plain text links: `Needs Cast (3)`

### Profile Screen MECE Rewrites (Potential Improvements)
> Both profile screens suffer from the same structural disease: information-dense record viewers instead of glanceable operator tools.

- [ ] **Participant Profile → Who/State/Action/Reference** — rewrite ParticipantProfilePage with the 4-bucket MECE model; one always-open action lane, everything else collapsed under Reference
- [ ] **Performance Profile → Who/State/Action/Reference** — rewrite PerformanceProfilePage: replace 3 tabs with a unified blocker queue; eliminate triple readiness summary redundancy and the 500-line WorkspaceTab dashboard-inside-a-dashboard
- [ ] **Both profiles simultaneously** — do not ship one paradigm without the other; operators context-switch between them constantly

## 🔴 Gate 10: Stability Audit (STOPPED LOGO WORK)
*Halting all AI-generated branding. Ensuring core stability.*
- [x] STOP all logo/icon activity (Requested by User)
- [x] Audit app for any regressions in core logic (Gate 3-9)
- [x] Create detailed "Input-Process-Output" technical trace (v25 Ohio Sync) ✅
- [x] Perform final production sync with `--no-verify-jwt` (v25) ✅
