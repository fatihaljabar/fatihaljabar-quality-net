# Release notes

## v1.2.0

**Status: see the release page of this tag.** The pipeline decides RELEASABLE or BLOCKED from data; this file states what the
version claims, not whether it passed. The call, the risks that stay accepted and the things to know before deploying are in
`assessment/03-release-decision.md`, section 11.

### What this version claims to deliver

Everything in v1.1.0, plus the smaller findings of the audit fixed, each guarded by a test that failed before the fix and passes
after:

- **Candidate invite links open the web app** (B14). The setting that builds them is the address of the web app; its default, the
  sample configuration, the production manifest and the readme now say so.
- **Unknown routes answer JSON** (B1). Pages for a record that cannot be loaded say why (not found, not allowed, invalid state or
  any other failure) instead of showing an empty form, and the candidate page no longer shows "complete" when it could not load.
- **Honest answers and pages:** deleting an assessment that has interviews answers 422 (B2); the web app signs a user out only on
  a 401 of a signed-in request (B5); the fit/gap page shows when a report is being updated or has failed (A6-UI); the portfolio
  page lists the configured skills that were not assessed (A4-UI).
- **Data kept intact:** the fit/gap report compares every skill row of a vacancy (B9); regenerating a portfolio is all or nothing
  and keeps assessor overrides (B3).
- **Trust boundaries:** an unknown tenant is refused, default organization or not (A9, the fallback); the allowed web origins must
  be explicit in production (B11).
- **Housekeeping:** the dead signup page is removed and every request of the web app is checked against the API's routes (B10);
  documentation drift is corrected and checked (B13).

### What this version does not claim

Three P1 findings are **accepted, not fixed**, each with an owner (Fatih): PR-1b (most web screens still have no tests), MS-1
(behaviours that were never specified) and MS-2 (what a portfolio shows for a skill with no evidence). Six smaller findings stay
open on purpose (A9b, B4, B7, B8, B12, MS-3), each with its reason in `assessment/01-audit.md`. No real language-model call was
exercised.

### Changes to know about when upgrading

- **`APP_BASE_URL` must be the address of the web app.** A deployment that set it to the API's address must change it.
- **`ALLOWED_ORIGINS` must list the web app's origin in production.** An empty value or `*` stops the boot with a message that
  names the variable. Outside production `*` is still accepted.
- **Unknown tenant:** a request that names a tenant the system does not know is answered 403, also where a default organization
  exists.
- **API:** deleting an assessment that has interviews answers 422; the portfolio read carries `not_assessed_skills`; unknown
  routes answer a JSON 404. The additions are backward compatible.
- **Web:** the signup page is removed (it could not work); a 403 no longer signs the user out.
- **No database migration** in this version.

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
