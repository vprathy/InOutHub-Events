---
name: Product North Star
description: Captures the product mission, MVP scope, core entities, and guardrails to ensure alignment with the overarching vision of InOutHub.
---

# InOutHub - Product North Star

InOutHub is a live event operations platform designed to bridge the operational gap between a validated roster of participants and the successful execution of a multi-stage event. 

**It is NOT a generic event management system.** 

## 1. The Core Workflow
The system's fundamental purpose is to drive this operational flow:
**Ingest -> Assemble Acts -> Schedule Acts -> Execute**

1.  **Ingest:** Import a validated participant roster from the organization’s source of truth (e.g., their registration system or a verified spreadsheet). This roster is strictly scoped to a specific Event. InOutHub does not manage the messy phase of registration or payments.
2.  **Assemble Acts:** Group participants into Acts, and capture critical logistics information for those acts.
3.  **Schedule Acts:** Schedule Acts across specific Stages building timelines.
4.  **Execute:** Run the event via a live Stage Console that provides real-time "What is happening now" and "What is coming next" operational awareness.

## 2. Core Operational Entities (V1 Definition)
V1 relies on the following operational primitives:

*   **Organization:** The tenant/business entity hosting the event.
*   **Event:** A designated happening bounded by dates/times.
*   **Stage:** A physical or logical execution lane within an event (e.g., Main Stage, Auditorium).
*   **Participant:** A roster record imported from a validated source of truth, representing a human being assigned to a specific Event. While the system supports both adult and youth events, Participant records may optionally include lightweight parent/guardian contact details when operationally necessary, but this is not the central organizing principle.
*   **Act:** The primary operational performance unit used to run the event. This is the central object that has logistics attached to it.
*   **LineupItem:** A scheduled placement of an Act on a Stage at a specific time.
*   **StageState:** The live operational state of a Stage during the event.

## 3. V1 In-Scope Features
The V1 MVP MUST support:
*   Importing a validated participant roster.
*   Assembling Acts from Participants.
*   Capturing essential logistics for each Act.
*   Scheduling Acts across Stages.
*   Tracking the arrival and readiness of Acts.
*   Executing the event through the live Stage Console.

## 4. V1 Explicitly Out of Scope Features
The following features are EXPLICITLY out of scope for V1 to ensure focus and speed to market:
*   Ticketing.
*   Payment processing.
*   Seating arrangements or charts.
*   General attendee management.
*   Participant check-in tracking or generic attendance tracking.
*   Family or guardian workflows.
*   Messaging automation (email/SMS blasts).
*   Advanced AI orchestration or complex AI scheduling generation.

## 5. Product Guardrails
To prevent feature bloat and system drift, adhere strictly to these constraints:
*   **Act is the Primary Object:** The `Act` remains the absolute core operational object driving the workflow.
*   **Team is Descriptive:** The concept of a `Team` may exist *only* as a descriptive grouping or metadata tag on a Participant. It is NOT a core workflow object.
*   **Console Simplicity:** The Stage Console must remain exceptionally simple, fast, and mobile-friendly for use in chaotic, low-light environments.
*   **Operational Clarity over Feature Breadth:** When evaluating new features, prioritize operational clarity and execution speed over trying to be everything to everyone. Do not expand the system into a general-purpose event management platform.
