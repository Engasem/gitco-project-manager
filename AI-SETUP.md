# GITCO AI and responsive UI

Live: https://engasem.github.io/gitco-project-manager/

The cloud-connected application uses Supabase Auth and per-account `app_state`.
The previous preview README is obsolete. Remembered sign-in stores a refreshable
session, never the password. Unchecking Remember me uses session-only storage.
Refresh data saves pending changes before replacing local state.

## Server configuration

Set `OPENAI_API_KEY` in **Supabase Dashboard → Edge Functions → Secrets**. Never
paste it into source code or chat. Optional `OPENAI_MODEL` defaults to
`gpt-4.1-mini`. The Edge Function uses built-in `SUPABASE_URL` and
`SUPABASE_ANON_KEY`. Apply the migration before deploying `gitco-ai`.

The handler validates tokens through Supabase Auth and checks approved admin
membership. Gateway JWT checking is disabled because the handler authenticates
requests itself. Public GET exposes only readiness, never data or secrets.

Projects use the existing `app_state.payload.projects`, not the empty normalized
tables. Tasks correspond to `stages`; execution-plan `workflow` entries are a
separate feature. Data remain scoped to the signed-in account. The assistant
supports reading, creating and updating projects/tasks, including project archive.
Delete and permission changes are not exposed.

Every write requires explicit confirmation. Server-side checks cover actor,
approved admin membership, field allowlists, dates/status/progress, five-minute
expiry, one-time use and unchanged data snapshots. Execution is transactional.
The action table retains an audit trail. Rate limit: ten AI context requests per
account per minute. Context limit: 200 projects, 100 stages/project and 1,000
characters/text field. Chat is one request at a time without retained history.

## Verification

- `node tests/smoke.cjs`: script syntax and UI wiring.
- `node tests/ai-edge.cjs`: handler authorization and tool-flow tests, mocked
  Auth/OpenAI responses.
- `node tests/responsive.cjs`: real Chromium, mocked cloud responses, both
  languages, widths 320–1440 and phone landscape. Set `PLAYWRIGHT_PATH` for a
  local Playwright installation. Set `BASE_URL` to test published assets.
- `node tests/live.cjs`: published assets, readiness and real unauthorized
  request rejection. This does not claim a successful model call.

Real database transaction tests were run and rolled back. A configured secret and
authenticated end-to-end model test are still required before declaring AI ready.

## Existing limitations

The original app_state owner policy allows owners to write their own state
regardless of membership role. The AI pathway independently requires approved
admin status. Ordinary viewer/editor enforcement and team sharing need separate
work before claiming complete multi-user authorization. Supabase also reports
disabled leaked-password protection. SECURITY DEFINER RPCs are intentionally
callable by authenticated users but check identity/authorization internally, use
fixed search paths and deny anonymous execution.
