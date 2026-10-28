# Spec 002: API test harness and critical-path suite

Status: accepted

## Spec

The API has test gems installed but no `spec/` directory, so nothing proves that the
behaviours the product depends on still hold. This spec adds the harness and a first
critical-path suite that locks in what works today (tenant isolation on sessions,
authentication, ending a session). Known defects are not part of this spec: each one gets
its own spec and its own failing test, so the history shows red before green.

Critical paths for this suite are those where a silent regression corrupts data or leaks
it across companies: tenant scoping, authentication and the session lifecycle.

In scope: RSpec setup, shared helpers, three first spec files, a CI job named `API tests`.
Out of scope: the Gemini live audio pipeline, the web app, and any defect fix.

## Acceptance Criteria

- **AC-1** Given a clean checkout and a Postgres database prepared with `rails db:create db:migrate`,
  When `bundle exec rspec` runs with no Gemini key and no network access to Gemini,
  Then the suite runs and exits 0.
- **AC-2** Given two tenants that each own a session,
  When an admin of tenant A requests a session of tenant B through the sessions endpoint,
  Then the response is 404 and tenant B's data is not returned.
- **AC-3** Given a known tenant,
  When a request to a protected endpoint carries no token, or a malformed token,
  Then the response is 401.
- **AC-4** Given an assessor ending a pending session,
  When the end request succeeds,
  Then the session is stored as ended with the requested reason, a pending portfolio exists for it,
  and exactly one portfolio generation job is queued but not executed.
- **AC-5** Given a pull request that changes `api/`,
  When CI runs,
  Then a job named `API tests` runs the suite, and the check is required before merge.

## Design Plan

- `api/spec/spec_helper.rb` and `api/spec/rails_helper.rb`: standard RSpec/Rails setup, transactional
  examples, `Sidekiq::Testing.fake!` so jobs are captured and never run.
- `api/spec/support/tenants.rb`: small helpers to create a tenant (organization), an assessment and a
  session for it, and to mint a signed token for it. No factory library, to keep the setup readable.
- Request specs under `api/spec/requests/`, one file per concern, each example tagged `[AC-n]`.
- `.github/workflows/api.yml`: Postgres and Redis service containers, Ruby from `api/.ruby-version`,
  `rails db:create db:migrate`, then `bundle exec rspec`. The check name is added to branch protection.
- Known limit: tests that need the real Gemini service are not possible here by design; the suite
  covers our logic around it, not the model's answers.

## Definition of Done

- [ ] AC-1 to AC-4 pass locally and in CI.
- [ ] `API tests` is a required check on `main`.
- [ ] The harness is documented well enough for another engineer to add a spec file.
- [ ] No company, product or client name appears in the change.
