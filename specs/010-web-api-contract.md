# Spec 010: The web app and the API agree on what a fit/gap report contains

Status: proposed

## Spec

The web app has no tests (audit finding PR-1b), and the fit/gap table shows an empty "Required" column because the web
reads a field called `required_level` while the API sends `expected_level` (audit finding A7). The assessor sees a Gap
or an Exceed with no level to compare against; the PDF export, built by the API, is right and the screen is wrong. The
same table also has a marker for a level changed by a human, but the API never sends the flag that switches it on.
Types in the web app are written by hand and nothing compares them with what the API returns, so this class of defect
reaches a screen unnoticed.

Required behaviour: one written sample of a fit/gap read, kept in the repository, is the agreement between the two
sides. The API must return exactly the fields of the sample, the web app must show what the sample contains, and the
table must be able to be tested on its own.

In scope: a web test harness (Vitest with a simulated browser), the shared sample, the fit/gap table and its type, the
flag for an overridden level in the API, and the release gate reading the web tests. Out of scope: the other pages,
the other web types that differ from the API (for example `ai_level` as text and `skill_id` as a number), the
development token in the bundle (A8) and end-to-end browser tests.

Assumption (no spec existed): the API is the source of truth for field names, so the web app changes, not the API.

## Acceptance Criteria

- **AC-1** Given the web app,
  When its tests run with `npm test`,
  Then they run without a network and without a real browser, and the pipeline runs them on every pull request.
  Verified by: the `Web build` job, which runs `npm test` before the build.
- **AC-2** Given the shared sample of a fit/gap read,
  When the comparison table renders its comparisons,
  Then every row shows the required level the sample carries, the candidate level, or a dash when there is none, and
  the result.
- **AC-3** Given a comparison flagged as overridden and one that is not,
  When the table renders them,
  Then only the flagged row carries the override marker.
- **AC-4** Given a fit/gap report built by the engine and read through the API,
  When its fields are compared with the shared sample,
  Then the report and each of its comparisons have exactly the fields of the sample, and the same kind of value in each.
- **AC-5** Given a portfolio skill with an assessor override and one without,
  When the engine builds the report,
  Then the comparison for the overridden skill is flagged as overridden and the other is not.
- **AC-6** Given web tests, API tests and gate tests that carry criterion tags,
  When the release check collects the tests,
  Then it reads the web tests too, so a criterion tested only in the web app counts as tested.

## Design Plan

- `contracts/fit-gap-report.json`: the sample, one report with three comparisons (exceeding and overridden, a gap, not
  assessed). It is data, not code, and both sides read the same file.
- Web: Vitest with jsdom and Testing Library as development dependencies, a `test` script, `npm test` in the `Web build`
  job before the build. `ComparisonTable.test.tsx` renders the sample (AC-2, AC-3). The type `SkillComparison` and the
  table read `expected_level`; the type also lists the other fields the API sends.
- API: `FitGap::Engine` adds `is_override` to each comparison from the override it already computes. A spec builds a
  report with the fake language model client, reads it through the endpoint, and compares the key sets and value kinds
  with the sample (AC-4, AC-5).
- `tools/release-check.js`: the list of test files includes `web/src/**/*.test.ts(x)`; one test on a temporary folder
  (AC-6).
- Known limits: the sample is kept in step with the API by the test of AC-4, and with the web by the test of AC-2; a
  field both sides rename together is not caught. Only the fit/gap table is covered; the rest of the web app is still
  untested.

## Definition of Done

- [ ] AC-2 to AC-6 fail before the fix and pass after, shown in the history; the harness itself (AC-1) is in place
      before the red run so the failures are about behaviour.
- [ ] A7 and PR-1b updated in the audit with links to the checks, and the narrower remaining scope of PR-1b written down.
- [ ] The existing suites stay green.
- [ ] No company, product or client name appears in the change.
