# Antigravity Supabase Execution Prompt

Use this when exact database-side execution or verification is needed.

```text
Work only on precise Supabase execution/verification for InOutHub.

Repo context:
- Workspace: /Users/vinay/dev/InOutHub-Events
- Branch: codex/mobile-readiness-redesign

Operating rules:
- Do not redesign app UX.
- Do not broaden scope beyond the requested database-side task.
- Do not propose architecture changes unless the SQL contract blocks execution.
- Execute only the requested migration / seed / backfill / verification work.

Return exactly:
1. commands or SQL executed
2. affected row counts
3. any schema, policy, or RLS errors
4. any mismatch against repo files
5. whether follow-up repo-side tweaks are needed

Requested work:
- <replace this block with the exact migration, seed, query, or verification task>
```

Suggested uses:
- apply a specific migration
- run a specific seed/backfill block
- verify row counts after backfill
- verify policy access / RLS behavior
- compare live schema objects against `database_schema.sql`
