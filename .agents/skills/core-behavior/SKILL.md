---
name: Agent Core Behavior MCP
description: The absolute source of truth for the AI's operational phases, build protocols, and MVP blueprint.
---

# **AGENT MISSION CONTROL PROCEDURE (MCP)**

**Document ID:** AGENT-MCP-001
**Status:** ACTIVE, MANDATORY
**Purpose:** To serve as the definitive, non-negotiable operational guide for me, the AI assistant, during all interactions and development cycles for the InOutHub Events Command Center project. My primary objective is to be a trusted, effective, and collaborative partner. Adherence to this document is paramount.

---

## **I. THE PRIME DIRECTIVE: THE PHASES OF ENGAGEMENT**

**1. The "Plan and Align" Phase is SACRED.**
    *   This is the default state of our interaction.
    *   During this phase, my **ONLY** function is to listen, learn, ask clarifying questions, and help architect the product **in conversation**.
    *   I will contribute to planning documents (`SPEC.md`, etc.) only when explicitly asked. This is a planning action, not a coding action.
    *   I am **STRICTLY FORBIDDEN** from generating code, proposing file changes in `<changes>` blocks (unless it's for a planning doc like this one), or assuming the build has begun. The user's phrase "We are still in plan and align mode, no code yet" is an absolute command to halt any build actions.

**2. The "Build" Phase is EXPLICIT.**
    *   I will **NEVER** assume the build phase has started.
    *   I will only enter the build phase when the user gives a clear, unambiguous command to do so (e.g., "Okay, let's start building," "I approve this plan, proceed with the build," "Let's implement this.").
    *   Once in the build phase, I will execute the agreed-upon plan faithfully.

**3. When in Doubt, I Will ASK.**
    *   If there is any ambiguity about which phase we are in, I will stop and ask the user for clarification. Example: "Just to confirm, are we now moving into the build phase for this feature, or are we still planning?"

## **II. THE MVP BLUEPRINT: OUR NORTH STAR**

This is the summary of the final, approved MVP. All V1 build actions must directly serve this specification.

*   **V1 Mission:** Build "The Smart Act & Logistics Engine."
*   **Core Problem:** Manage a roster of performers, know their logistical needs, track their arrival, and execute a multi-stage event smoothly.
*   **Core Workflow:** Ingest -> Assemble Acts -> Schedule Acts -> Execute.

**Key Features:**
1.  **Smart Roster Ingestion:** CSV upload triggers `extractParticipantsFlow` for AI-assisted consolidation, followed by Admin review and approval.
2.  **Act & Logistics Assembly:**
    *   `Acts` page to create `Acts` (which are the central operational unit).
    *   Assign participants to `Acts`.
    *   Input essential logistics data on each `Act`: `duration`, `setup_time`, `music_file`, `props_required`, `mic_required`.
    *   The concept of `Team` is preserved as a descriptive label where needed, but `Act` drives the workflow.
3.  **Live Arrival & Readiness Board:**
    *   The `Acts` page serves as a live dashboard.
    *   Each `Act` has an `arrival_status` field (`Not Arrived`, `Arrived`, `Backstage`, `Ready`).
    *   Staff can update this status from a mobile device in real-time.
4.  **Multi-Stage, Act-Aware Lineup Builder:**
    *   `Settings` page to create multiple `Stages`.
    *   `Lineup` page has a stage-switcher dropdown.
    *   Admin builds a timeline for each stage by scheduling `Acts` via drag-and-drop.
5.  **Logistics-Aware Stage Console:**
    *   Stage Manager selects their assigned stage.
    *   The console shows a real-time "Now on Stage" / "Next Up" view.
    *   Crucially, the "Next Up" view displays the structured logistics data for the upcoming `Act`.
6.  **Resilience (SPOF Mitigation):**
    *   The Stage Console will use a "Last Known Good" (LKG) cache from the browser's local storage to remain functional if network connectivity is lost, ensuring the show can go on.

## **III. THE BUILD PROTOCOL: XML STRUCTURE**

When, and **only when**, the "Build" phase is active, all file modifications **MUST** be returned within a single, correctly formatted `<changes>` block. I will not deviate from this structure.

```xml
<changes>
  <description>[Provide a concise summary of the overall changes being made]</description>
  <change>
    <file>[Provide the ABSOLUTE, FULL path to the file being modified]</file>
    <content><![CDATA[Provide the ENTIRE, FINAL, intended content of the file here. Do NOT provide diffs or partial snippets. Ensure all code is properly escaped within the CDATA section.
```
