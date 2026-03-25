# Post-Approval Readiness Convergence

Date: 2026-03-25

## Purpose

Define how an approved and converted `performance_request` should seed the downstream readiness model instead of stopping at shell creation.

The goal is not to blur request approval and operational readiness.
The goal is to make conversion create the right operational follow-up posture automatically.

## Why This Is Needed

Current behavior is directionally correct:
- request is reviewed
- request is approved
- request converts into a real performance / act

But the current conversion still leaves too much interpretation work to operators afterward.

Today, conversion creates the operational record, but it does not yet reliably bootstrap:
- act-level readiness expectations
- participant-side requirement follow-up
- next-action guidance tied to what the request actually told us

That means the product still drops useful intake signal on the floor after conversion.

## Scope

This plan covers only post-approval behavior:
- after a request is approved
- when it is converted into an act/performance

It does not replace:
- request review
- mapping review / confirm / lock
- the broader requirements-engine cleanup

## Product Guardrails

- Do not collapse request approval into readiness approval.
- Keep the `Act` as the primary operational object after conversion.
- Use imported request fields to seed follow-up, not to falsely mark work complete.
- Prefer deterministic seeding over vague AI inference.
- Mobile operators should see the resulting next actions clearly on Performance and Participant surfaces.

## Core Principle

Conversion should create:
1. the operational shell
2. the correct readiness posture
3. the first clear next actions

It should not create:
- a falsely “ready” performance
- duplicated intake/request state inside operational screens
- hidden follow-up debt that operators have to rediscover manually

## Data Signals We Already Have

Useful request-side signals already exist or are derivable:
- `title`
- `lead_name`
- `lead_email`
- `lead_phone`
- `duration_estimate_minutes`
- `music_supplied`
- `roster_supplied`
- `notes`
- `raw_payload`
- request type / category hints from source payload

These should drive the initial readiness posture after conversion.

## Desired Convergence Behavior

### 1. Performance-Level Seeding

On conversion, the act/performance should be created with:
- title
- duration
- imported-request reference
- contact summary
- intake notes summary

In addition, the conversion should seed performance-level follow-up expectations such as:
- music submitted vs not submitted
- intro/media likely needed
- support/team contact likely needed
- stage/technical notes likely still needed

Important:
- `music_supplied = true` should not automatically mean “music approved”
- `roster_supplied = true` should not automatically mean “cast ready”

These are signals, not automatic clearance.

### 2. Participant-Side Seeding

If participant or roster detail becomes available after approval:
- participant records should inherit the right requirement posture
- special requests from the request source should become visible follow-up where relevant
- missing guardian/contact/document gaps should appear as participant readiness work, not remain buried in raw intake data

If no participant detail exists yet:
- the performance should clearly show that roster follow-up is still required

### 3. Workspace Guidance

After conversion, the operator should not have to guess what matters next.

The performance workspace should show:
- what came from intake
- what is still missing operationally
- the next recommended action

Examples:
- `Music was indicated in the request, but no approved file is attached yet.`
- `Roster was not supplied. Add performers or request cast details.`
- `Intro is still required before this performance can be treated as fully ready.`

This guidance should be deterministic and contract-backed.

## Recommended V1 Convergence Rules

### Performance Rules

When converting an approved request:

- if `music_supplied = true`
  - seed the performance into a “music expected” posture
  - do not auto-clear the music requirement

- if `music_supplied = false`
  - seed a visible follow-up for missing music only if the event’s requirement policy expects music

- if `roster_supplied = true`
  - seed the performance with a softer “cast detail expected” hint unless actual participant records were created

- if `roster_supplied = false`
  - surface `Needs roster follow-up` prominently

- if request notes or raw payload indicate technical/stage needs
  - surface them as operational notes or checklist prompts
  - do not silently bury them in history

### Intro / Media Rules

- conversion should not auto-approve intros
- conversion should seed the intro requirement state to `open` / `draft expected` when appropriate
- if request type/category suggests a performance likely needs an intro, expose that in the performance prep lane

### Contact Rules

- lead/requestor contact should remain attached as intake lineage
- operational team/contact management should remain a separate downstream concept
- do not overwrite team manager semantics with requestor semantics
- when a request is converted, the requestor should become the default external contact shown on the resulting performance until a real internal team manager/contact is assigned
- this is a contact-default rule, not an automatic RBAC/user invitation rule
- do not silently grant the requestor platform access, event membership, or operator permissions

### Approval vs Creation Rules

- keep approval and operational creation distinct in the model
- shorten the common operator path in the UI

Recommended operator actions:
- primary: `Approve & Create Performance`
- secondary: `Approve Only`

Why:
- most operators approve because they want the performance shell created immediately
- preserving a separate `approved` state is still useful for exceptions
- the common path should not require two taps when one is the normal outcome

## UX Requirements

### Performance Profile

Needs:
- imported request summary near the top
- one next-action card tied to operational follow-up
- readiness metrics that reflect missing media/roster/contact prep honestly

### Participant Profile

Needs:
- special requests and missing-contact consequences surfaced as follow-up where applicable
- no duplication of request-story history when participant-specific readiness work exists

### Request Workspace

After conversion:
- show clear success state
- allow opening the created performance directly
- make it obvious that operational follow-up now lives in the performance workspace

Before conversion:
- make `Approve & Create Performance` the primary action for pending requests
- keep `Approve Only` available as a secondary path for cases where approval should not immediately create the operational shell

## Suggested Technical Approach

### Batch 1: Readiness Seeding Contract

- define the exact conversion-to-readiness mapping rules
- centralize them in backend logic, not scattered UI heuristics
- preserve request lineage without duplicating request state into every screen

### Batch 2: Performance Workspace Integration

- surface imported request summary and next-action guidance on Performance Profile
- make missing roster/music/intro follow-up visible and concise

### Batch 3: Participant Bridge

- where roster details exist, connect imported request obligations to participant-side readiness work
- ensure special requests or missing guardian/contact requirements become visible in participant follow-up lanes

## Acceptance Criteria

This batch is complete when:

- converting an approved request creates a performance with a correct initial readiness posture
- imported request signals influence follow-up, but do not falsely mark requirements complete
- the Performance Profile clearly shows the next operational action after conversion
- participant-side follow-up becomes visible when participant data exists
- operators no longer need to infer core post-conversion follow-up from raw notes alone

## Roadmap Placement

This belongs:
- after mapping review / confirm / lock
- before declaring performance-intake onboarding fully stable across tenants
- before broader manual emergency intake expansion

## Non-Goals

- full requirements-engine rewrite
- AI-generated readiness decisions
- automated participant creation from sparse request notes
- post-conversion delete/rollback policy

Those remain separate roadmap tracks.
