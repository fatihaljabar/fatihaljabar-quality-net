# Release notes

## v1.1.0

**Status: see the release page of this tag.** The pipeline decides RELEASABLE or BLOCKED from data; this file states
what the version claims, not whether it passed. The call, the two risks that were accepted instead of fixed, their owner
and the conditions are in `assessment/03-release-decision.md`, section 10.

### What this version claims to deliver

Everything in v1.0.0, plus three more P1 findings fixed and guarded by a test that failed before the fix and passes after:

- **The fit/gap table shows the required level** (A7). The web app followed a field name the API does not send. The API now
  also sends the flag for a level changed by an assessor, so the override marker appears.
- **A development login token never reaches a production build** (A8). The cause was deeper than the build setting: a
  dependency copies every `VITE_` variable into the public files, so the build now defines that one variable as undefined
  and the app reads it only in development mode.
- **Web installs are reproducible** (PR-2): a committed lockfile, installed with `npm ci` by the `Web build` job.

The quality net grew with them: the web app has a test runner, run on every pull request next to the build; the web and the
API are tested against one shared sample of the fit/gap read; and the release gate reads web tests too.

### What this version does not claim

Two P1 findings are **accepted, not fixed**, each with an owner (Fatih):

- **PR-1b:** most web pages have no tests. Only the fit/gap table, the source of the login token and the production bundle do.
- **MS-1:** several behaviours were never specified (roles, signup, vacancies, retention of candidate transcripts and
  audio, editing an assessment after interviews). They await a product decision.

The P2 and P3 items listed in `assessment/01-audit.md` are also open. No real language-model call was exercised.

### Changes to know about when upgrading

- **API:** each comparison in the fit/gap read now carries `is_override`. The change is additive.
- **Web:** `VITE_DEV_TOKEN` is ignored by production builds; it still works with `npm run dev`. The web app now has
  `npm test`, and its dependencies are installed from a lockfile.
- **No database migration** in this version.

## v1.0.0

**Status: see the release page of this tag.** The pipeline decides RELEASABLE or BLOCKED from data; this file states
what the version claims, not whether it passed. For this version the call and the reasons are in
`assessment/03-release-decision.md`.

### What this version claims to deliver

The platform (an API and a web app for voice interviews that end in a skill portfolio and a fit/gap report) with the
defects that the audit ranked P0 and P1 on the data and security side fixed, and a quality net around it.

Fixed and guarded by a test that failed before the fix and passes after:

- **The API boots in production** (A10, P0). It could not start with the production configuration.
- **Companies are isolated** (A1, A2). A token is issued only for the user's own company, and another company's
  portfolios, reports and overrides answer 404 exactly like an id that does not exist.
- **A session ends only when it is running, with a true reason** (A3).
- **A portfolio states only what the interview supports** (A4). A skill that was not examined is not stored, a level
  must be valid, and the confidence is computed from the interview data.
- **A skill becomes covered only on the model's judgement** (A5).
- **A fit/gap report is replaced, never deleted first, and carries a status and an error** (A6, data and API).

The quality net: a definition-of-ready gate on every pull request, 56 API tests on every pull request, and this release
gate on every version tag. How they work and what they leave out: `assessment/02-quality-system.md`.

### What this version does not claim

Open P1 findings, from `assessment/01-audit.md`: A7 (the fit/gap table's "Required" column is empty because the web and
the API name the field differently), A8 (a development login token set at build time ends up in the public bundle),
PR-1b (the web app has no tests), PR-2 (no npm lockfile) and MS-1 (several behaviours were never specified). The P2 and P3
items listed there are also open. No real language-model call was exercised.

### Changes to know about when upgrading

- **Database:** two migrations. `users.tenant_id` is required and existing users are assigned to the first non-default
  organization, which is what login implicitly did before; the migration fails if users exist and no organization does.
  `fit_gap_reports` gains `generation_status` (existing reports become complete) and `generation_error`.
- **Login:** an `X-Tenant-Scheme` header is optional and must name the user's own company; any other value answers 401.
- **`POST /sessions/:token/audio_complete`:** answers 422 for a session that has not started. A session that is ended
  before all skills are covered is stored as `manual_candidate`, not `all_covered`.
- **Fit/gap read:** the report now includes `generation_status` and `generation_error`. An override or a regeneration
  keeps the previous report, marked pending, until the new one is ready.
- **Behaviour:** a skill is no longer promoted to covered because it left the model's window, so some interviews will
  run to the time limit instead of finishing early. A skill that was not assessed is absent from the portfolio page.
