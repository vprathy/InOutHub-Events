# Antigravity Task: Requirements And Readiness Verification

```text
Work only on precise Supabase execution/verification for InOutHub.

Repo context:
- Workspace: /Users/vinay/dev/InOutHub-Events
- Branch: codex/mobile-readiness-redesign

Operating rules:
- Do not redesign app UX.
- Do not broaden scope beyond the requested database-side verification.
- Do not propose architecture changes unless the SQL contract blocks verification.
- Execute only the requested verification and return exact results.

Return exactly:
1. SQL executed
2. row counts / aggregate results
3. any missing objects or policy errors
4. any mismatch against repo files
5. whether repo-side follow-up tweaks are needed

Requested verification:

1. Verify these objects exist in live Supabase:
- requirement_policies
- requirement_assignments
- map_legacy_act_requirement_code(text)
- bridge_act_requirements_sync()

2. Verify starter act policy rows exist and report counts by code for:
- ACT_AUDIO
- ACT_INTRO
- ACT_LIGHTING
- ACT_MICROPHONE
- ACT_VIDEO
- ACT_POSTER
- ACT_GENERATIVE
- ACT_GENERATIVE_AUDIO
- ACT_GENERATIVE_VIDEO
- ACT_WAIVER

3. Verify requirement_assignments were backfilled for act-side readiness:
- total count of assignments
- count by status
- count grouped by policy code

4. Verify whether any trigger currently exists on act_requirements that calls bridge_act_requirements_sync.
- if yes, report trigger name and enabled/disabled state
- if no, say explicitly that no live trigger is active

5. Spot-check consistency between act_requirements and requirement_assignments:
- compare 10 sample acts
- for each sample act, report requirement_type, fulfilled, mapped policy code, and assignment status
- call out mismatches only

6. Verify RLS/policy presence on:
- requirement_policies
- requirement_assignments

7. Do not apply changes unless verification reveals a clear missing migration object.
If something is missing, stop after reporting the exact mismatch.
```
