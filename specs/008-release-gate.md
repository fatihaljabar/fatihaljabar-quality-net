# Spec 008: The release gate

Status: proposed

## Spec

The pull request gate decides whether a change may merge. A release needs a different question answered: is this
version safe to ship, and does the pipeline prove it? Today nothing answers it. Tests can be green while a serious
finding is still open, and a release can carry a requirement nobody tested.

The release gate runs on a version tag. It runs the same net as every pull request and then decides, from data,
whether the version is RELEASABLE or BLOCKED. It never decides from a message or a person's say-so. The verdict
is attached to the tag so anyone can see it without reading a log.

It checks three things beyond the tests (the entry condition of the "release-ready" gate):

1. No P0 or P1 finding in the audit is still open, unless the risk is accepted in writing with a named owner.
2. Traceability holds both ways: every acceptance criterion of every spec has a test, and every test tag names a
   criterion that exists.
3. The release notes have a section for this version.

In scope: the check, the workflow on tags, the traceability tags, the audit table format. Out of scope: deciding
whether a finding is correctly rated (a human review, recorded in `03-release-decision.md`), and deploying anything.

Assumptions (no spec existed, to be confirmed by product):
- A finding is accepted for release only by writing `Accepted` with `owner:` and a reason in its status cell. An
  acceptance without an owner does not count.
- The audit table is the source of truth for open findings. The check enforces its form, not its honesty; a
  wrongly rated finding is caught by review, not by this check.

## Acceptance Criteria

- **AC-1** Given an audit table with a P0 or P1 row whose status is Remaining,
  When the release check runs,
  Then the verdict is BLOCKED and names that row; rows whose status is Fixed do not block.
- **AC-2** Given a P0 or P1 row whose status is Accepted,
  When the release check runs,
  Then it does not block and is listed as an accepted risk with its owner; an Accepted status with no owner blocks.
- **AC-3** Given a spec criterion that no test is tagged with, and that is not marked as verified by CI,
  When the release check runs,
  Then the verdict is BLOCKED and names the criterion.
- **AC-4** Given a test tag that names a criterion no spec defines,
  When the release check runs,
  Then the verdict is BLOCKED and names the tag.
- **AC-5** Given release notes with no section for the tag,
  When the release check runs,
  Then the verdict is BLOCKED.
- **AC-6** Given the tests failed,
  When the release check runs,
  Then the verdict is BLOCKED, whatever else holds.
- **AC-7** Given every condition holds,
  When the release check runs,
  Then the verdict is RELEASABLE.
- **AC-8** Given an audit table that cannot be read, or that holds no P0 or P1 rows,
  When the release check runs,
  Then the verdict is BLOCKED, because a gate that cannot read its input must not pass.
- **AC-9** Given a version tag pushed to the repository,
  When the pipeline runs,
  Then a release page for that tag states RELEASABLE or BLOCKED with the reasons, and the pipeline run is red when
  the verdict is BLOCKED. Verified by: the release workflow run on the tag, not by a unit test.
- **AC-10** Given a criterion that mentions the marker words in its text without being marked, that is, without the
  exact spelling and the colon that the design plan defines,
  When the release check runs and no test is tagged with that criterion,
  Then the verdict is BLOCKED and names the criterion; only the exact marker exempts a criterion from needing a test.

## Design Plan

- `tools/release-check.js`: pure functions for each criterion plus a small command line. It reads
  `assessment/01-audit.md` (the ranked table), `specs/*.md`, the tagged tests and `RELEASE_NOTES.md`, takes the test
  results as arguments, writes a Markdown report and exits non-zero when BLOCKED. A reader sees the verdict first.
- Traceability: tags have the form `[NNN/AC-n]`. The tests of specs 001 and 002 used a bare `[AC-n]` and are renamed
  (names only, no assertion changes) so every tag is unambiguous. A criterion that is satisfied by the pipeline rather
  than a test carries the exact marker `Verified by:` (capital V, with the colon; nothing looser counts) and is exempt from needing a tag; spec 002 has two (AC-1, AC-6) and spec 008 has one (AC-9).
- Audit table: the status cell starts with `Fixed`, `Remaining` or `Accepted`. Rows that were half fixed are split so a
  fixed finding carries no hidden remainder: the display follow-ups of A4 and A6 become their own P2 rows, and the web
  half of PR-1 its own P1 row.
- `.github/workflows/release.yml`, on tags `v*.*.*`: run the `API tests` workflow (made reusable) and the gate tests,
  then a status job runs the check and creates or updates the GitHub release for the tag. The release title carries the
  verdict, the body holds the report, a blocked version is marked as a pre-release and never as the latest, and the job
  fails when BLOCKED so the run on the tag is red. Actions are pinned by commit SHA; permissions are read-only except
  in the job that writes the release. Run by hand (`workflow_dispatch` with a version) the same pipeline is a dry run: it
  reaches the same verdict and publishes nothing, so a version can be checked before it is tagged.
- Where tests are looked for: `api/spec`, `tools` and, since spec 010, `web/src` (files ending `.test.ts` or `.test.tsx`).
- Tests: `tools/release-check.test.js` on `node:test`, one named test per criterion tagged `[008/AC-n]`; the gate's
  own test job runs it.
- Known limits: the verdict is only as honest as the audit table, which is edited by hand. The check proves a test
  exists for a criterion, not that the test is good. It does not look at deployment.

## Definition of Done

- [ ] AC-1 to AC-8 have tests that fail before the check exists and pass after, shown in the history.
- [ ] A tag produces a release page with a verdict, and the run is red when BLOCKED, shown on a real tag.
- [ ] The retagged tests keep their assertions; nothing is weakened to pass.
- [ ] `RELEASE_NOTES.md` states what the version claims, and `03-release-decision.md` records the call and the owner.
- [ ] The gate is reusable for the next version without editing the script.
- [ ] No company, product or client name appears in the change.
