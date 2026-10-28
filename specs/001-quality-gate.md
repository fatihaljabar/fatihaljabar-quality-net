# Spec 001: Definition-of-Ready gate

Status: accepted

## Spec

No change may merge unless it carries its inputs: a linked spec, acceptance criteria
in Given/When/Then form, a short design plan, a Definition of Done, and, when it
changes production code, tests. Today the repository has no tests, no CI and no
written acceptance criteria, so nobody can say whether a change is correct.

The gate runs on every pull request and fails by itself, with a message that names
what is missing. It is path-based and deterministic: it cannot be skipped with a
label or a checkbox.

In scope: pull request validation (spec link, spec completeness, test presence).
Out of scope: release gating and the AC-to-test traceability matrix (a later spec),
and the product test suites themselves.

## Acceptance Criteria

- **AC-1** Given a pull request that changes any non-exempt file,
  When the PR body has no `Spec:` line pointing at an existing `specs/*.md` file,
  Then the check fails and says the spec link is missing or points to nothing.
- **AC-2** Given a linked spec,
  When any of the sections Spec, Acceptance Criteria, Design Plan or Definition of Done
  is missing or has no content,
  Then the check fails and names each incomplete section.
- **AC-3** Given a linked spec,
  When the Acceptance Criteria section contains no item of the form
  `AC-n ... Given ... When ... Then ...`,
  Then the check fails.
- **AC-4** Given a pull request that changes production code
  (`api/app`, `api/config`, `api/db`, `web/src`, `tools`, excluding test files),
  When no test file changes in the same pull request,
  Then the check fails.
- **AC-5** Given a pull request that only changes exempt paths
  (`assessment/`, `specs/`, `README.md`, `RELEASE_NOTES.md`),
  When the check runs,
  Then it passes without requiring a spec link or a test.
- **AC-6** Given a pull request with a complete linked spec and, if it changes production code, a changed test,
  When the check runs,
  Then it passes and prints the spec path it validated.

## Design Plan

- `tools/dor-check.js`: Node script, no dependencies. It receives the PR body and the list of
  changed files, evaluates AC-1 to AC-6 as pure functions, prints one line per failure and
  exits non-zero when any failure exists.
- `tools/dor-check.test.js`: tests on `node:test`, one named test per AC, tagged `[AC-n]`.
- `.github/workflows/gate.yml`: job `dor` on `pull_request`; checks out full history, computes
  changed files from the base branch, passes the PR body through an environment variable
  (never interpolated into the shell).
- `.github/pull_request_template.md`: asks for the `Spec:` line and a Definition-of-Done checklist.
- Exempt paths and test-file patterns live in one constant at the top of the script so the
  rules are visible and reviewable in a single place.
- Known limit: the check proves a spec exists and is complete, not that it is good.
  Quality of the spec stays a human review decision.

## Definition of Done

- [ ] Tests for AC-1 to AC-6 pass in CI.
- [ ] One pull request is blocked by the gate (missing spec) and left visible.
- [ ] One pull request passes the gate and is merged.
- [ ] The gate is documented so another engineer can run and extend it.
- [ ] No company, product or client name appears in the change.
