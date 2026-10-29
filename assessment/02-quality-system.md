# 02. The quality system

This is the net that makes a missing spec, a dropped requirement or a silent regression hard to ship unnoticed.
It has two halves: a **workflow gate** that refuses a change that does not carry its inputs, and a **test and CI net**
that refuses a change that breaks something that matters. Both run by themselves on every pull request, and the
four checks they produce are required before anything merges to `main`.

## 1. The workflow gate (definition of ready)

A change is not ready to build, and not done, without: a spec, acceptance criteria written as Given/When/Then, a short
design plan and a definition of done. Since upstream cannot always supply a clean spec, the gate is where one becomes a
hard precondition.

| Piece | What it is |
|---|---|
| `specs/NNN-name.md` | The input. Sections: Spec, Acceptance Criteria (`AC-n`, Given/When/Then), Design Plan, Definition of Done. Written before the code. |
| `.github/pull_request_template.md` | Asks for one line, `Spec: specs/NNN-name.md`, and a definition-of-done checklist. A reminder only; the CI check enforces. |
| `tools/dor-check.js` | The check. Dependency-free Node. Reads the PR description and the changed files, prints one line per failure and exits non-zero. |
| `.github/workflows/gate.yml` | Runs the check and its own tests on every pull request, and again when the description is edited. |
| Branch protection on `main` | `Definition of Ready`, `Gate tests`, `API tests` and `Web build` must pass to merge. |

What it blocks (spec 001, acceptance criteria 1 to 6):

- No `Spec:` line, or a link to a file that does not exist.
- A spec with a missing or empty section, or with no criterion written as Given/When/Then.
- Production code changed with no test file changed in the same pull request.

What it lets through, on purpose: a change that only touches documentation (`assessment/`, `specs/`, `README.md`,
`RELEASE_NOTES.md`). The exemption is decided by **path**, never by a label or a checkbox, so it cannot be argued
around; a workflow or configuration change is not exempt and needs a spec too.

**Shown working on real pull requests, left visible:**

| Pull request | What it shows | Result |
|---|---|---|
| #3, a JSON 404 for unknown routes, written the way a rushed change is (no spec, no test) | The gate firing red | `BLOCKED [AC-1]` no spec link and `BLOCKED [AC-4]` production code without a test. Run 40701801279. Never merged. |
| #2, the gate itself, with its spec and tests | The gate passing | `PASSED (spec: specs/001-quality-gate.md)`. Run 40700323153. |
| #10, the audit report | The path exemption | `PASSED (only exempt paths changed)`. |

**What it protects:** nobody can merge a code change that has no written criteria and no test.
**What it deliberately does not do:** judge whether a spec is any good. A section containing only a placeholder passes;
spec quality stays a review decision. It also does not check that a test really exercises its criterion (see section 4).

## 2. The test and CI net

Job `API tests`: Postgres and Redis service containers, Ruby 3.3.2, `rails db:create db:migrate`, then `bundle exec
rspec`. It has no path filter on purpose: it is a required check, and a required check that is skipped never reports and
locks the pull request. The runner sets `CI=true`, which turns eager loading on, as in production.

Nothing in the suite calls the language model. It is replaced by a fixed answer, and every example that depends on it
also expects the call to happen, because the background job swallows its own errors and a silent failure would
otherwise look like "nothing changed".

56 examples, aimed at the paths where a silent failure corrupts data or leaks it across companies, not at coverage of
trivial code:

| File (examples) | Class of failure it catches | Audit item |
|---|---|---|
| `boot_spec` (2) | The code cannot be loaded or the production environment cannot boot. | A10 |
| `portfolio_isolation_spec` (7), `tenant_isolation_spec` (2) | One company reading or changing another's data; ids that reveal what exists. | A1 |
| `login_spec` (4), `authentication_spec` (3) | A token issued for the wrong company; missing, malformed or forged tokens accepted. | A2 |
| `audio_complete_spec` (5), `session_end_spec` (2) | A session ended by anyone with a link, or stored with a reason that did not happen; ending not queuing exactly one portfolio job. | A3 |
| `portfolio_generator_spec` (10), `fit_gap_not_assessed_spec` (1) | A level or confidence stored without support; an unexamined skill reported as a gap. | A4 |
| `coverage_analyzer_worker_spec` (4) | A skill reaching "covered", and an interview ending, without a judgement. | A5 |
| `fit_gap_regeneration_spec` (13), `fit_gap_generator_worker_spec` (2) | A report deleted before its replacement, jobs piling up, a failure with no record. | A6 |
| `fit_gap_without_tenant_spec` (1) | Background jobs, which run with no company in context, breaking when scoping changes. | guards A1 |

Each example is tagged with its spec and criterion, for example `[003/AC-4]`. Specs 001 and 002 predate that
convention and first used a bare `[AC-n]`; those tags were renamed (names only, assertions untouched) so every tag now
says which spec it belongs to.

**How a check is trusted.** For every defect: the test is written first and shown failing **for the right reason**
(the failure message is read, not only counted); after the fix it is broken again on purpose (a mutation) to prove the
test catches it; and the original attack is replayed on running code. Several times this caught my own mistakes, listed
in section 5.

## 2b. The web install check

Job `Web build` (spec 009) installs the web app with `npm ci --ignore-scripts` and builds it. `npm ci` refuses to run
without a lockfile and fails when the lockfile and `package.json` disagree, so an install can no longer drift. Two tests
in `Gate tests` read the lockfile: it must record exactly the dependencies of `package.json`, and every locked package
must come from the public registry with an integrity hash. What this does **not** do: judge whether the pinned versions
are safe, update them, or test the app (that is the harness still missing, section 4). Like `API tests` it has no path
filter, and it is a required check on `main` since it was added to the branch protection after pull request #17.

## 2c. Web tests and the contract with the API

The web app now has a test runner (Vitest with a simulated browser, no network), run by `Web build` before the build
(spec 010). The agreement between the two services is one written sample of a fit/gap read, `contracts/fit-gap-report.json`:
the web test renders the table from it and checks the required level, the candidate level and the override marker; an API
spec builds a real report, reads it through the endpoint and checks that it has exactly the sample's fields and kinds of
value. A field renamed on one side fails one of the two tests. What it does **not** do: a field renamed on both sides at once
is not caught, only the fit/gap read has a sample, and the other pages are untested.

## 3. The net against what the audit found

The net would have caught the audit's defects before a human looked:

| Finding | Check that catches it |
|---|---|
| A10 production cannot boot | `API tests`, eager load. **It found it by itself**: the first run of the suite failed on it. |
| A1, A2 company isolation | `API tests`, isolation and login specs. |
| A3, A4, A5, A6 | `API tests`, the files in the table above. |
| PR-1 no inputs, no tests | The gate, and `API tests`. |
| PR-2 no lockfile | `Gate tests` (two tests on the lockfile) and `Web build` (`npm ci`), see section 2b. |
| A7 field mismatch between web and API | `Web build` (table test) and `API tests` (contract spec), see section 2c. |
| A8 token in the bundle | **Not yet.** A web harness exists now, but no build check looks for the token (section 4). |

## 4. What the net does not cover

- **Most of the web app has no tests.** Only the fit/gap table is covered. A8 is known and unguarded, and any other web regression goes unnoticed.
- **Only one contract exists** (the fit/gap read). Other responses that the web reads by hand-written types, such as the portfolio, have no sample and no test; that is the class of bug behind A7.
- **Traceability proves presence, not quality.** The release gate (section 4b) checks both ways that every criterion has
  a test and every tagged test points at a real criterion. It cannot tell whether the test is a good one. A criterion is exempt from needing
  a test only with the exact marker `Verified by:`, but the gate cannot check that the pipeline really verifies it.
- **The model itself.** Tests cover our logic around the model, not the quality of its answers, and no real model call
  has been exercised.
- **The live audio path** (reconnection, time limit, wrap-up) has no test, and neither do the web pages that drive it.
- **The release gate reads the audit table as written.** It proves the table's form, not its honesty: a finding that is
  rated too low passes. That judgement is recorded and owned in `03-release-decision.md`.
- **The gate can be bypassed by the repository owner.** Branch protection does not apply to administrators, so that
  the owner can still commit directly as the brief allows. Mitigation: every code change went through a pull request,
  and the blocked demonstration pull request was left unmerged. Owner of the risk: Fatih.

## 4b. The release gate

On a version tag (`v*.*.*`), `.github/workflows/release.yml` runs the same `API tests` workflow and the gate tests, then
`tools/release-check.js` decides RELEASABLE or BLOCKED from data (spec 008):

- every P0 or P1 row of the audit table is Fixed, or Accepted with a named owner;
- every acceptance criterion of every spec has a test tagged `[NNN/AC-n]`, or says it is verified by the pipeline, and
  every tag names a criterion that exists;
- `RELEASE_NOTES.md` has a section for the version;
- the tests passed.

The verdict is the title of the release page of that tag (`v1.0.0: BLOCKED` or `v1.0.0: RELEASABLE`), with the reasons
in its body; a blocked version is a pre-release and never "latest", and the run on the tag is red. A gate that cannot
read its input blocks. Run by hand with a version, the same pipeline is a dry run that publishes nothing.

## 5. Red to green

One row per defect. "Red" is a CI run that failed on the commit that added the tests; "green" is the run on the commit
that fixed it. Run ids are those of the `API tests` job, except in the last three rows, where the failing jobs differ and are named.

| Defect | Spec | Red (commit, run, result) | Green (commit, run, result) | Note |
|---|---|---|---|---|
| A10 production boot | 002 | `9fa6186`, 40702976783, failed while loading the code | `cbd29da`, 40706951531, 9 of 9 | Tests committed as `5ac4dcb`, fix `e7886c4`. The CI run itself found the defect. |
| A1, A2 company isolation | 003 | `9d65409`, 40708190296, 9 of 21 failed | `7ed010d`, 40717838596, 21 of 21 | A1 fix `9658569`, A2 fix `7ed010d`. |
| A3 ending a session | 004 | `bf7581c`, 40733321284, 2 of 26 failed | `9c39efa`, 40737387793, 26 of 26 | |
| A4 portfolio stores unsupported values | 005 | `39c7533`, 40741395837, 9 of 37 failed | `473287c`, 40743220463, 37 of 37 | |
| A5 covered without judgement | 006 | `b413f72`, 40744779569, 2 of 41 failed | `2ca89fa`, 40746182960, 41 of 41 | |
| A6 fit/gap regeneration | 007 | `52eb069`, 40748070986, 14 of 56 failed | `0b5c19e`, 40749209203, 56 of 56 | A correction to my own tests sits between them: `be62f78`. |
| Release gate exempts a criterion that only mentions the marker words | 008 (AC-10) | `a02980e`, 40847104962, 2 of 31 gate tests failed | `449a50c`, 40847607071, 31 of 31 | A flaw in the gate itself (pull request #15), found by running it on its own documents. |
| PR-2 no web lockfile | 009 | `9334d73`, 40850212863 and 40850212963, 2 of 33 gate tests failed and `npm ci` refused to run | `9ca38be`, 40850385571 and 40850385481, 33 of 33 and a clean install and build | Pull request #17. The fix is the lockfile itself. |
| A7 empty required column, no override flag, gate blind to web tests | 010 | `7ff110f`, 40854365743 (web), 40854365637 (API, 2 of 58 failed), 40854365805 (gate, 1 of 34 failed) | `baee822`, 40855517854 (web, 2 of 2), 40855517846 (API, 58 of 58), 40855517838 (gate, 34 of 34) | Pull request #20. One test, the override marker in the table, was green from the start: it guards a path that already worked. |

No check was made green by deleting or weakening it. The one change to a test after its red run, `be62f78`, fixed a
reference that could not resolve and left every assertion as it was. Every pull request is merged with a merge commit,
never squashed, so both runs stay in the history.

**Mistakes of mine that the process caught**, because honesty beats green:

- A test helper whose name collided with a Rails method failed all seven first examples, and it was my bug, not the
  application's. A throttle counter kept in Redis made unrelated examples fail with 429 and, for a while, made a result
  look better than it was; each example now has its own store.
- A validation I wrote to allow an empty list rejected one, for the same reason the old one did; a failing test showed it.
- A constant my tests could not reach stayed hidden while the code was unfixed, because those examples failed earlier,
  and showed only afterwards; it is fixed in its own commit.
- I assumed eager loading would be off in CI. It is on, and that is how A10 was found.
- A first hypothesis (A9) turned out not to reproduce and was lowered from P1 to P2 in the audit.
- I mis-stated a count in a pull request description and corrected it against the run output.

## 6. Running and extending it

The commands to run everything are in the repository `README.md`, and were run from an empty database to check them.
To add a check:

1. Write `specs/NNN-name.md` from an existing spec, with Given/When/Then criteria.
2. Write the test first, tag it `[NNN/AC-n]`, run it and read why it fails. A test that fails for a wrong reason is not
   yet a test.
3. Commit the test, push, and let CI show it failing. Then fix, push, and let CI show it passing.
4. Break the fix on purpose once, to see the test fail, then restore it.
5. Merge with a merge commit. To make a new workflow a required check, add its job name to the branch protection.
   Do not give a required workflow a path filter.
