---
name: Domain Model and RBAC Rules
description: Defines the strict hierarchy of Organizations, Events, Stages, Acts, and the Role-Based Access Control limits for PII and data lineage.
---

# InOutHub - Domain Model & RBAC "Bible"

This document serves as the absolute source of truth for the overarching architecture of the InOutHub Events Command Center. Every database table, API route, and UI component must adhere to these definitions.

## 1. The Domain Hierarchy

The platform manages data in a strict top-down hierarchy:

1.  **Organization (The Tenant):** The root business entity (e.g., "Star Dance Studio", "Global Tech Conference"). An Organization hosts Events.
2.  **Event:** A specific happening over a defined date range (e.g., "Winter Recital 2026").
3.  **Location:** The physical street address where the Event takes place (e.g., "City Convention Center"). An Event can technically span multiple discrete Locations, though typically it is just one.
4.  **Stage:** A specific performance or operational space *within* a Location (e.g., "Main Stage", "Auditorium", "Ballroom A").
5.  **Act:** The core operational unit measuring a discrete block of time on a Stage (e.g., "Senior Jazz Routine", "Keynote Speech"). Acts belong uniquely to an Event but are scheduled onto Stages.
6.  **Participants / Staff:** Human beings linked to Acts with specific roles (Performer, Choreographer, Stage Hand).
7.  **Assets:** Digital (Music Files, Participant Pictures) or Physical (Props, Instruments) items required by an Act.
8.  **Waivers:** Legal compliance documents triggered by Specific Assets or Participant Roles. For the MVP, these will be internal digital "Clickwrap" signatures.

## 2. PII, Roles & Granular RBAC (Role-Based Access Control)

Because the platform handles PII (Personally Identifiable Information) and minors, data visibility is strictly governed by Role-Based Access Control (RBAC).

### General RBAC Rule: "Context Above, Detail Below"
A user assigned to a lower-level element (e.g., an Act) needs the "Big Picture" to do their job, but must be shielded from the PII of other acts.
*   **Big Picture:** They can see the *entire Event Lineup* (Schedules, Stage Names, Act Names).
*   **Specifics:** They can *only* see the detailed records (Participant PII, specific Assets, signed Waivers) for the entities they are explicitly assigned to manage.

### The Role Definitions

1.  **Org Admin (The Creator):**
    *   *Creation:* The person who creates the Organization automatically becomes the Org Admin.
    *   *Permissions:* God-mode for that Organization. Can see all PII across all Events. Can create other Org Admins. Can delegate powers downward.
2.  **Event Admin:**
    *   *Permissions:* Can manage the schedule, stages, and all acts/rosters *within a specific Event*. Cannot see data for other Events in the Organization.
3.  **Stage Admin (e.g., The Stage Manager):**
    *   *Permissions:* Can manage the live operational status (`arrival_status`) of any Act scheduled to hit their assigned Stage. Can view the logistics (props, AV) for those acts, but cannot edit the fundamental roster or schedule.
4.  **Act Admin (e.g., Choreographer, Coach):**
    *   *Permissions:* Can view the overarching Event Lineup (to know when they perform). Has full read/write access *only* to their assigned Acts (Can add/remove their own Participants, define their Assets, and sign their Waivers). Blind to the PII of Participants in other Acts.
5.  **Shared Support Staff (e.g., Roaming Stage Hand, AV Tech):**
    *   *Permissions:* Similar to an Act Admin, but assigned across multiple Acts. They can see the full Event Lineup. They can tap into the specific logistical details (Assets, Requirements) of the specific Acts they are assigned to assist.

## 3. Data Lineage & Registration

The platform never loses the original context of how a human entered the system.

1.  **The Master Roster (Landing Zone):** Data flows in messily from external portals, internal forms, and messy spreadsheets. This is ingested into a `event_registrations` holding area.
2.  **Lineage Tracking:** The platform records the `source_system` and `external_reference_id` (e.g., ticket number) for every person. This ensures that if a refund or cancellation happens externally, the system knows exactly who to deactivate inside InOutHub.
3.  **Guardian Lineage:** The system tracks `primary_guardian` and `secondary_guardian` relationships, as well as `special_requests`, securing the chain-of-custody for minor participants.

---
*End of Domain Model & RBAC Bible.*
