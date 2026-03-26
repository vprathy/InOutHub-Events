# Deployment Notes

## `import-participants` JWT posture

Date: 2026-03-25

Near-term production posture for [`import-participants`](/Users/vinay/dev/InOutHub-Events-main/supabase/functions/import-participants/index.ts):

- deploy with JWT gateway verification disabled
- repo truth is [`supabase/config.toml`](/Users/vinay/dev/InOutHub-Events-main/supabase/config.toml) with:
  - `[functions.import-participants]`
  - `verify_jwt = false`

Why this posture is currently intentional:

- live reconciliation found the function was already operating with the gateway bypass enabled
- restoring gateway-level verification introduced risk of `401 Unauthorized` regressions at the edge gateway layer
- the function still enforces authenticated access in code through:
  - required `Authorization` header
  - `supabaseClient.auth.getUser()`
  - event-admin or super-admin role verification via RPC

Operational guardrail:

- this posture is acceptable only while the in-function auth and RBAC checks remain intact
- do not describe this as gateway + application “double-locking”; the gateway check is intentionally bypassed for this function
- if auth architecture changes, revalidate this deployment posture before changing it
