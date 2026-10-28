# Spec 003: Tenant isolation for portfolios and login

Status: proposed

## Spec

Each company (tenant) must only ever read or change its own data. Two defects break this
(audit findings A1 and A2):

- A1: portfolios, portfolio skills, fit/gap reports and assessor overrides are loaded by id with
  no tenant check. An admin of one tenant can read, export and override another tenant's
  candidate data, and can tell by the error message whether an id exists.
- A2: the login endpoint issues a token for whichever tenant the client asks for in the
  `X-Tenant-Scheme` header. Users are not tied to a tenant, so any admin can obtain a token for any tenant.

Required behaviour: data of another tenant is indistinguishable from data that does not exist,
and a user can only obtain a token for the tenant they belong to.

In scope: the models and controllers named above, the login endpoint, a migration that ties users
to a tenant. Out of scope: how the tenant is resolved for the candidate invite link and the
websocket endpoints, tenant resolution fallbacks to a default organization (audit finding A9),
signup, and any web change.

Assumption (no spec existed): an existing user belongs to the first non-default organization,
which is what the login endpoint implicitly did before. Product must confirm this before
production data is migrated.

## Acceptance Criteria

- **AC-1** Given a portfolio of tenant B,
  When an admin of tenant A requests it through export, fit/gap read, fit/gap create, fit/gap regenerate
  or the skill override endpoint,
  Then every response is 404, no override is created, no report is created and no job is queued.
- **AC-2** Given a portfolio of tenant A,
  When an admin of tenant A uses the same endpoints,
  Then they keep working.
- **AC-3** Given an id that exists only in tenant B and an id that exists nowhere,
  When an admin of tenant A requests them,
  Then the two responses are identical in status and body.
- **AC-4** Given a user who belongs to tenant A,
  When they log in with the `X-Tenant-Scheme` of tenant B, or of a tenant that does not exist,
  Then the response is 401 with the same message as a wrong password, and no token is issued.
- **AC-5** Given a user who belongs to tenant A,
  When they log in with no tenant header, or with the header of tenant A,
  Then the token carries tenant A's scheme.
- **AC-6** Given no tenant in the request context, as in background jobs,
  When a worker loads a portfolio and builds a fit/gap report,
  Then it still works.

## Design Plan

- A1: give `Portfolio`, `PortfolioSkill`, `FitGapReport` and `AssessorOverride` a default scope that
  restricts them to rows reachable from a session of the current tenant, expressed as a subquery on
  the already tenant-scoped `Session`. No new columns and no data migration. Controllers need no change:
  `find` then raises `RecordNotFound`, which already renders a 404, and the same 404 for a missing and a
  foreign id removes the existence leak. Checked: with a tenant in the request store the subquery becomes
  `sessions.tenant_id = <id>`; without one it is unscoped, which keeps workers working.
- A2: migration adds `users.tenant_id` (bigint, not null), backfilled with the first non-default organization,
  and fails loudly if users exist but no organization does. `AuthenticationController` finds the user, loads the
  user's organization, rejects a header that names a different scheme with the generic 401, and issues the
  token with the user's own scheme. The fallbacks to "first organization" and a hard-coded scheme are removed.
- Tests: request specs for AC-1 to AC-5 in `api/spec/requests/`, and a service spec for AC-6, all tagged
  with their AC id. Fake Gemini client for AC-6; nothing calls the network.
- Known limits: scoping stays fail-open when no tenant is in the request store (audit finding A9). The
  default scope adds a subquery to every portfolio query; acceptable now, revisit with a `tenant_id` column
  if portfolio volume grows.

## Definition of Done

- [ ] Each AC test fails before the fix and passes after, shown in the commit history.
- [ ] A1 and A2 marked fixed in the audit with a link to the tests.
- [ ] The existing suite stays green.
- [ ] The user-to-tenant assumption is written in the assessment notes with an owner.
- [ ] No company, product or client name appears in the change.
