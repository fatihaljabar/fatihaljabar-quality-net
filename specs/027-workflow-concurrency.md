# Spec 027: A release dry run does not cancel the tests of main

Status: proposed

## Spec

The `API tests` workflow keeps one run per branch and cancels an older one when a newer commit arrives, so a superseded run
does not waste a runner. It is also called by the release workflow, which runs the same net on a tag or, started by hand
from `main`, as a dry run. Both runs then have the same concurrency group, because the group is built from the branch only:
`api-refs/heads/main`. Starting a dry run from `main` therefore cancels the run that a merge had just started on `main`.

This happened twice (v1.1.0 and v1.2.0): the commit that holds the release carries an `API tests` run marked cancelled until
someone starts it again. A cancelled run on the main branch is not a failure, but a reviewer reading the history sees a red-looking
mark on the commit that matters most, and the net did not run on it until it was repeated by hand.

Required behaviour: the group of the API tests includes the name of the workflow that started the run, so a run called by
the release workflow never shares a group with the pushes and pull requests of `API tests` itself; a newer commit still cancels the older run of
its own workflow.

In scope: the concurrency group of the `API tests` job. Out of scope: the other workflows, whose groups are not shared with
anyone, and what a dry run does.

Assumption (no spec existed): the name of the calling workflow is available as `github.workflow` inside a reusable workflow, so
it tells the two situations apart.

## Acceptance Criteria

- **AC-1** Given the `API tests` workflow, which the release workflow calls,
  When its concurrency group is read,
  Then the group contains the name of the workflow that started the run, besides the branch.
- **AC-2** Given the same workflow,
  When its concurrency settings are read,
  Then a newer run of the same group still cancels the older one.

## Design Plan

- `.github/workflows/api.yml`: the group becomes `api-${{ github.workflow }}-${{ github.ref }}`. Inside a reusable workflow
  `github.workflow` is the name of the caller, so a dry run is `api-Release gate-refs/heads/main` and a push is
  `api-API tests-refs/heads/main`.
- `tools/workflow-concurrency.test.js`: reads the workflow file and checks the two criteria, tagged `[027/AC-n]`. A test of
  the file proves the group is written as intended, not how GitHub behaves.
- Behaviour proof outside the test: after the merge, a dry run is started while the push run of the merge commit is still
  running, and both must complete.
- Known limits: the unit test cannot show how GitHub evaluates the group; the proof after the merge does.

## Definition of Done

- [ ] AC-1 fails before the fix and passes after, shown in the history; AC-2 keeps passing.
- [ ] A dry run started during the push run of `main` leaves that run complete, shown on the real workflows.
- [ ] No company, product or client name appears in the change.
