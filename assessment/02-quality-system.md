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
| #25, the same JSON 404 change as #3, with a spec and tests | The change that was blocked, done with its inputs | Red on the tests first, then green and merged. |

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

56 examples when the first version was released and 91 now (the added ones are listed in section 2e), aimed at the paths where a silent failure corrupts data or leaks it across companies, not at coverage of
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
are safe, update them, or test the app (that is section 2c). Like `API tests` it has no path
filter, and it is a required check on `main` since it was added to the branch protection after pull request #17.

## 2c. Web tests and the contract with the API

The web app now has a test runner (Vitest with a simulated browser, no network), run by `Web build` before the build
(spec 010). The agreement between the two services is one written sample of a fit/gap read, `contracts/fit-gap-report.json`:
the web test renders the table from it and checks the required level, the candidate level and the override marker; an API
spec builds a real report, reads it through the endpoint and checks that it has exactly the sample's fields and kinds of
value. A field renamed on one side fails one of the two tests. What it does **not** do: a field renamed on both sides at once
is not caught, only the fit/gap read has a sample, and the other pages are untested.

## 2d. The production bundle check

A test in the `Web build` job (spec 011) runs the real `vite build` into a temporary folder with a marker token in the
environment and searches every output file for the marker. It exists because the first fix, reading the token only in
development mode, did not remove it from the published files; only the test showed that. What it does **not** do: look
for any other name. All `VITE_` variables are copied into the bundle by a dependency, so the check covers the one name the
code treats as a credential, and the rule that no secret goes into such a variable is by convention only.

## 2e. Checks added with the smaller findings

After the first release the remaining findings of the audit were fixed one at a time, each with its own spec (012 to 026; spec 027 is about the gate itself, see section 4b).
The checks they added, by what they protect:

| Check | Where | Class of failure it catches |
|---|---|---|
| Unknown routes answer JSON; known routes unchanged | `api/spec/requests/unknown_routes_spec.rb` | An HTML error page, or a router that hides a missing route |
| Deleting an assessment reports what happened | `assessment_delete_spec.rb` | A success answer for something that did not happen |
| Portfolio regeneration is atomic and keeps overrides | `services/portfolio_regeneration_spec.rb` | A half portfolio, or a human decision deleted by a rebuild |
| One fit/gap comparison per vacancy skill row | `services/fit_gap_duplicate_labels_spec.rb` | A requirement that silently disappears from a report |
| The portfolio read lists skills that were not assessed | `requests/portfolio_not_assessed_spec.rb` | An unassessed skill indistinguishable from an unconfigured one |
| An unknown tenant is refused, default organization or not | `requests/tenant_resolution_spec.rb` | A client's mistake served as a tenant nobody chose |
| Every request the web app makes has an API route | `contracts/web_routes_spec.rb` | Web and API drifting apart (the class of A7 and B10) |
| Every route a controller comment names exists | `contracts/route_comments_spec.rb` | Comments that describe routes that are not there |
| The allowed origins are explicit in production | `spec/config/allowed_origins_spec.rb` | A copied sample opening the API to every site |
| The invite link opens the web app, and its settings agree | `models/session_invite_url_spec.rb` | Candidates sent to a route the API does not have |
| Readme, sample configuration and web project agree | `tools/docs-consistency.test.js` | Instructions that describe something that is not there |
| The HTTP client signs out only on a 401 of a signed-in request | `web/src/services/api.test.ts` | Loops and lost error messages after a 403 or a refused login |
| The candidate page never shows "complete" for a failed load | `pages/interview/InterviewPage.test.tsx` | A candidate told the interview was recorded when it was not |
| Pages say why a record could not be loaded | the page tests of specs 016 and 017 | Empty forms and pages for a record that cannot be loaded |
| The fit/gap page shows an update in progress or a failure | `pages/fitgap/FitGapReportStatus.test.tsx` | A report that changes or fails with no sign on screen |
| The portfolio page shows what was not assessed | `pages/portfolio/PortfolioNotAssessed.test.tsx` | The same, on the page |

Totals when this was written: 91 API examples, 32 web tests and 38 gate tests. Two of the checks read across the stack and run in
`API tests` because it checks out the whole repository: the web requests against the routes, and the web service files against
the router.

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
| A8 token in the bundle | `Web build` (tests of the token source and of the real production build), see section 2d. |
| B10, B11, B13, B14 web calls with no route, a copied sample, wrong instructions, invite links to the API | The route, configuration and documentation checks of section 2e. |

## 4. What the net does not cover

- **Most of the web app is still untested.** The tests listed in section 2e and the fit/gap table, the login token source and the production bundle are covered; the audio hooks, the hardware check, the forms and the other screens are not, and a regression there goes unnoticed.
- **Only one response has a sample** (the fit/gap read); requests are checked against the routes (section 2e) but not their bodies. Other responses that the web reads by hand-written types, such as the portfolio, have no sample and no test; that is the class of bug behind A7.
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

Two flaws of the gate itself were found after the releases and fixed with the usual loop: the report of a releasable version said
it passed every check even when risks were accepted (it now says "Releasable with N accepted risks. It is not a clean
release"; pull request #41), and a dry run from `main` cancelled the `API tests` run of the merge commit because the two shared a
concurrency group (the group now includes the name of the starting workflow; pull request #42, proved by a dry run started while
the push run was still going). The release pages already published were not edited.

## 5. Red to green

One row per defect. "Red" is a CI run that failed on the commit that added the tests; "green" is the run on the commit
that fixed it. Run ids are those of the `API tests` job, except in the rows that name another job (`Web build` or the gate tests).

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
| A8 development token in the production bundle | 011 | `d923281`, 40857524228 (web, 2 of 7 failed) | `ff21371`, 40857824931 (web, 7 of 7) | Pull request #22. The first fix, in the app code only, left the bundle test red; the second part is in the build configuration. Two other jobs of the same commits passed and are not listed. |
| B1 unknown routes (API) | 012 | `68d3091`, 40918410622, 5 of 6 failed | `b9e3acc`, 40918607943 | Pull request #25. The change that pull request #3 shows blocked, this time with a spec and tests. |
| B2 delete reports success | 013 | `15c60a6`, 40919286577, 1 of 67 failed | `f79d305`, 40919454554 | Pull request #26. |
| B5 sign-out on every 401 and 403 (web) | 014 | `b0ad3e5`, 40920297320 (web, 2 of 10 failed) | `e09a0c1`, 40920415923 (web) | Pull request #27. Jobs: `Web build`. |
| B6 failed load shown as complete (web) | 015 | `d9a9854`, 40921209878 (web, 1 of 13 failed) | `809cb84`, 40921602307 (web) | Pull request #28. A second commit changed only how my test produced the rejection, with the assertions unchanged, and is disclosed in the pull request. |
| B1 empty forms for a missing record (web) | 016 | `34b1691`, 40922210553 (web, 4 of 18 failed) | `d6b5f34`, 40922352669 (web) | Pull request #29. |
| B1 report pages (web) | 017 | `d94fca6`, 40923133264 (web, 5 of 25 failed) | `e6e45db`, 40923275388 (web) | Pull request #30. |
| B9 duplicate labels in fit/gap | 018 | `51beee5`, 40923629690, 1 of 69 failed | `7dddc8c`, 40923774486 | Pull request #31. |
| B3 portfolio regeneration | 019 | `6bf5b18`, 40924233887, 2 of 73 failed | `b09f925`, 40924377914 | Pull request #32. |
| A6-UI fit/gap page status | 020 | `ab01771`, 40925324589 (web, 4 of 30 failed) | `bfefa64`, 40925441227 (web) | Pull request #33. |
| A4-UI not assessed skills | 021 | `a531782`, 40925818169 (API, 2 of 75) and 40925818210 (web, 1 of 32) | `4c30d9a`, 40925958986 (API) and 40925958895 (web) | Pull request #34. |
| A9 unknown tenant fallback | 022 | `852a682`, 40928639907, 1 of 79 failed | `f0ad76f`, 40928793955 | Pull request #35. Three of its four examples guard what already worked, and the spec says so. |
| B10 web calls without a route | 023 | `90921d6`, 40929238090, 1 of 81 failed | `e2a0aee`, 40929317746 | Pull request #36. The check names the one request, POST /signup. |
| B11 allowed origins | 024 | `8051a0b`, 40929784885, spec did not load | `9ee40f4`, 40929898570 | Pull request #37. |
| B14 invite link points at the API | 025 | `d4136e5`, 40930803921, 3 of 90 failed | `a8189ea`, 40930982328 | Pull request #38. |
| B13 documentation drift | 026 | `3f3674c`, 40931496146 (gate, 4 failed) and 40931496427 (API, 1 failed) | `e1f68de`, 40931705561 (gate) and 40931705577 (API) | Pull request #39. |

No check was made green by deleting or weakening it. Three tests were changed after their red run, and each left every
assertion as it was: `be62f78` fixed a reference that could not resolve; `824d76c` changed how a test produced a rejected
request, because this version of the test runner fails a test whose mock returns a rejected promise; and the web test of
spec 011 was rewritten from `it.each` to a loop in pull request #23 so the release check could read its tag. Every pull request is merged with a merge commit,
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
- I assumed the bundler would drop an unused value, so the first fix of A8 was too small; the bundle test stayed red and showed
  the real cause.
- Two first attempts at a fix were wrong and the new tests rejected them: the candidate page stayed on its pre-start screen
  because the screen I added came after it, and a rebuilt portfolio showed a stale list because an association was loaded before
  the rows changed.
- A script of mine that was meant to break and restore files failed silently twice (a variable holding several words); I
  noticed because I read its output, restored the files from the commit and ran it again with checked copies.

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
