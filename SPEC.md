# InOutHub Events Command Center - Product Roadmap & Specification

This document represents the definitive plan for the InOutHub Events Command Center. All development will follow this specification. This plan was co-created during the "Plan and Align" phase.

## 1. Core Vision & Guiding Principles

- **Vision:** To be the single source of truth for event execution, from participant roster to live stage logistics, providing real-time awareness for the entire event staff.
- **Core Problem:** Event execution is chaotic. Staff need a single, real-time tool to manage performers, logistics, and schedules to prevent cascading delays and ensure a smooth show.
- **Guiding Principle:** Ship a lean, valuable V1 that solves the most painful problems first, then layer on powerful AI and automation features.

## 2. UI/UX Philosophy

- **Mobile-First, Adaptable Second:** The application is designed for phones and tablets first. It will adapt gracefully to larger screens, not just shrink.
    - **Phone:** Single-column layouts, slide-out "sheet" navigation.
    - **Tablet:** Two-column layouts, icon-rail navigation.
    - **Desktop:** Full multi-column layouts, expanded sidebar for a "command center" experience.
- **Visual Style: "Mission Control in Your Hand"**
    - **Default Dark Theme:** A high-contrast dark theme is the default for usability in low-light event environments. A light theme will be a user-configurable option.
    - **Deliberate Palette:** A deep dark background, off-white text for readability, and a single, vibrant primary blue for all interactive elements to provide clear affordance.
    - **Typography:** `Manrope` font for its excellent readability. `Source Code Pro` for any monospaced text.
    - **Component Language:** Clean, modern components via ShadCN, with rounded corners and subtle shadows.
- **Interaction Principles:**
    - **Explicit Save:** The user is always in control. The application will track unsaved changes and prompt the user before they lose work.
    - **On-Demand AI:** AI assists, it does not dictate. All AI suggestions are presented to the user for explicit approval or rejection.

## 3. Product Roadmap

### V1: The Smart Act & Logistics Engine

**Goal:** Solve the core problem of managing the roster, knowing their needs, tracking their arrival, and executing the show.

- **Features:**
    1.  **Continuous Master Roster Sync Engine:**
        -   **The Core Problem:** Registration is messy. Data comes from varied sources (internal members, external groups, VIP invites) while the event is live, and statuses change (refunds, deactivations).
        -   **The Solution:** An ingestion engine that accepts data from varied sources and consolidates it into a single, unified "Master Roster" of Participants.
        -   **Continuous Sync:** The engine must support continuous updating until registration closes, intelligently matching new data to existing profiles and updating their `status` (e.g., Active, Refunded, Deactivated).
        -   **AI Reconciliation:** The `extractParticipantsFlow` AI is used to resolve conflicts, parse varied data structures into a standard format, and flag anomalies for Admin review.
    2.  **Multi-Stage Event Setup:**
        -   Admin can create and name multiple `Stages` (e.g., "Main Stage", "Workshop Room A") for an event.
    3.  **Acts Assembly (Roster ➔ Execution):**
        -   An `Acts` page serves as the bridge between the Roster and the Stage.
        -   Admin converts the Master Roster into `Acts` by assembling Participants (with specific roles like Performer or Staff) into logical performance units.
        -   Admin populates core logistics data (`duration_minutes`, `setup_time_minutes`, `act_assets`, `act_requirements`).
    4.  **Live Arrival & Readiness Board:**
        -   The `Acts` page serves as a live dashboard showing the `arrival_status` of each Act.
        -   Designated staff can update status from a mobile device (`Not Arrived` -> `Arrived` -> `Backstage` -> `Ready`).
    5.  **Act-Aware Lineup Builder:**
        -   A `Lineup` page with a stage-switcher dropdown.
        -   Admin manually schedules `Acts` onto the selected stage's timeline.
    6.  **Logistics-Aware Stage Console:**
        -   A real-time, mobile-first view for the Stage Manager.
        -   The user selects their assigned stage.
        -   Displays "Now on Stage" and "Next Up", showing the structured logistics data for the upcoming Act.
        -   Updates instantly when the Admin saves lineup changes.
        -   Simple controls (`[Finish Performance]`) advance the show.

### V2: The AI Co-Pilot

**Goal:** Save time and prevent logistical errors before they happen.

- **Features:**
    - **On-Demand AI Lineup Validator:** An AI review that analyzes the schedule for logistical issues (e.g., insufficient setup time) and presents suggestions for the Admin to accept or reject.
    - **Enhanced Data Ingestion:** Add support for Google Sheets and Excel file imports.
    - **Advanced Readiness Board:** Introduce `Requirements` (checklists) that can be assigned to `Acts` for more granular readiness tracking (e.g., "Waiver Signed").
    - **Assistive Intro Composition Tools:** Admin-only tooling may help curate and assemble act intro media, but all outputs remain approval-driven and secondary to live event execution.

### V3: The Participant & Family Experience

**Goal:** Reduce communication overhead and provide a world-class, personalized experience.

- **Features:**
    - **Personal Digital Cockpit:** A secure login for participants/guardians to see their personal schedule and tasks.
    - **Family Command Center:** A guardian-centric view to manage multiple dependents from one login.
    - **AI Guardian Escalation:** For critical tasks involving minors, the AI will intelligently escalate notifications up the chain of guardianship if a response is not received.

### V4: The Autonomous Communications Engine

**Goal:** Automate the flow of information to ensure everyone knows what they need to know, when they need to know it.

- **Features:**
    - **AI Communications Manager:** An interface for the Admin to create message templates and rules for automated sending.
    - **Automated Alerts:** The system sends autonomous alerts based on real-time event state (e.g., "Green Room" calls, schedule slippage warnings).

## 4. Data & Architecture

- **Data Model:**
    - **`Act`:** The central operational entity. Contains logistics data (`duration`, `setup_time`, `music_file`, `props_required`, `mic_required`) and `arrival_status`.
    - **`Team`:** Preserved as a descriptive label or grouping mechanism for participants, but is not the primary driver of the event workflow.
    - **`UserProfile`:** Represents an individual person (participant, guardian, staff).
    - **`Stage`:** A new entity to represent a physical or virtual location within an event.
    - **`LineupItem`:** Belongs to a `Stage` and is linked to an `Act`.
- **Backend & Database:** Supabase (PostgreSQL, Authentication, Real-time Subscriptions).
- **Frontend:** React built with Vite (Single Page Application for true offline PWA).
- **Data Fetching:** React Query (for caching and offline resilience).
- **Styling:** Tailwind CSS, ShadCN UI.

## 5. Non-Functional Requirements

- **Security:**
    - All data access will be governed by Supabase Row Level Security policies and role-scoped access rules.
    - Authentication will be handled via Supabase Auth and organization/event membership controls.
    - Sensitive PII and child data protection will be paramount in rule design.
- **Performance & Latency:**
    - The Stage Console **must** have real-time synchronization with the backend. Changes made by the Admin must reflect on the console with sub-second latency.
    - UI interactions should feel instant. Page loads should be fast.
- **Cost & Budget Considerations:**
    - The architecture will be designed to leverage Supabase and Google AI services cost-effectively for V1.
    - Storing large assets (audio/video files) will be deferred to later versions. V1 will link to files, not host them.
    - Polling frequencies and AI model usage will be optimized to be cost-effective, scaling with usage.
- **Resilience (SPOF Mitigation):**
    - The primary single point of failure (SPOF) for this application is network connectivity at the event venue. The application must be resilient to intermittent or complete loss of Wi-Fi.
    - The application will implement a "Last Known Good" (LKG) cache using the browser's local storage for essential data like the participant roster and all stage lineups.
    - If network connectivity is lost, the Stage Console will seamlessly switch to this LKG cache. While it will not receive new updates, it will remain fully functional, allowing the Stage Manager to view the schedule and advance performances. This prevents a catastrophic failure and ensures the show can go on until connectivity is restored.
