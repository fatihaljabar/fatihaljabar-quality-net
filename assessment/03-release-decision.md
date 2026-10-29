# 03. Release decision: v1.0.0

| | |
|---|---|
| **Decision** | **BLOCKED. Do not release this version to a client.** |
| Gate verdict | BLOCKED, five open P1 findings. Dry run on `main`: [run 40841198699](https://github.com/fatihaljabar/fatihaljabar-quality-net/actions/runs/40841198699). The run on the tag must give the same verdict. |
| Date | 2026-10-29 |
| Decision owner | Fatih, as the owner of the engineering quality gate |

## 1. The call, in plain words

The version is a clear improvement on what I was given. The service can now start in production, one company can no
longer reach another's candidates, an interview can no longer be ended by anyone holding its link, and what the
portfolio and fit/gap report store is backed by the interview. Every one of those fixes has a test that failed before
the fix and passes after, in the history.

It is still not safe to ship, for a reason the tests cannot show: **the whole web app has no tests**, and two known P1 defects live there. One makes the fit/gap table look finished while a column is empty; the
other can put a login token into the public files. A client would meet exactly those two first. I would rather block on
a real data risk that looks fine than ship green and be asked about it.

## 2. What the gate checked, and what it found

The release gate runs on a version tag. It runs the same net as every pull request, then decides from data.

| Check | How | Result for v1.0.0 |
|---|---|---|
| Tests | 56 API examples and 31 gate tests, run by the same workflows as a pull request. | **Pass** |
| Open P0 and P1 findings | Reads the ranked table in `assessment/01-audit.md`: 14 rows are P0 or P1. | **Blocked:** 8 fixed, 1 accepted with an owner, **5 open** |
| Traceability, both ways | Every acceptance criterion of every spec has a test tagged `[NNN/AC-n]`, and every tag names a real criterion. 49 criteria in eight specs. | **Pass:** 46 have a tagged test, 3 are verified by the pipeline |
| Release notes | `RELEASE_NOTES.md` has a section for the version. | **Pass** |
| Unreadable input | A table the gate cannot read blocks instead of passing. | Not triggered |

**The five open P1 findings that block:**

| ID | What is wrong | Who is hurt | Workaround today |
|---|---|---|---|
| A7 | The fit/gap table's "Required" column is empty: the API sends `expected_level`, the web reads `required_level`. | The assessor cannot interpret a Gap or an Exceed. The screen and the PDF disagree, and the PDF is right. | Use the PDF export. |
| A8 | A development login token, if set when the web app is built, ends up in the public files and lets any visitor past the login screen. | Everyone, if a production build is made the way the README describes. | Never set that variable for a production build; check the built files. |
| PR-1b | The web app has no tests, so any web regression, including the two above, is unnoticed. | Everyone who uses the web app. | A manual walk through the main screens before each release. |
| PR-2 | No lockfile for the web dependencies, so builds are not reproducible. | Whoever builds: a different install tomorrow can change behaviour. | Install from a reviewed copy of the dependency list. |
| MS-1 | Several behaviours were never specified: roles, signup, vacancies, retention of candidate transcripts and audio, editing an assessment after interviews. | The candidates, whose data is kept for an undefined time. | None; this needs a product decision. |

**Accepted with an owner:** MS-2 (what a portfolio shows for a skill with no evidence). The behaviour is defined by an
assumption in spec 005 until product confirms it. Owner: Fatih.

**Also open, not blocking:** 15 P2 and 2 P3 items in the audit, such as a delete that reports success when nothing is
deleted, and tickets that were closed without being fixed. None of them corrupts data or leaks it.

## 3. Why I agree with the gate, and what I would gate before a client

The gate decided from data, and I agree with it for these reasons. A7 is the kind of defect the quality bar calls
serious: the screen looks right while a value underneath is missing. A8 is a credential exposure that depends on how a
build is made. The two cannot be caught by anything that exists today because the web app is untested, so "all green"
here would mean "nothing looked", not "nothing is wrong".

Before this reaches a client I would require, in this order:

1. A web test harness, with a contract test that compares what the API returns with what the web reads. That fixes A7
   and its whole class, and gives PR-1b a start.
2. A check that fails the build when the built files contain a token, and a fallback that exists only in development
   (A8).
3. A lockfile, and an install from it in CI (PR-2).
4. A decision from product on the behaviours in MS-1, written as specs, or an explicit acceptance with a named owner.
5. A run of the interview against the real language model, which has not happened at all (section 4).

## 4. What the gate cannot see

- **The language model itself.** Every test replaces it with a fixed answer. The code around it is tested; the quality
  of its answers is not, and no real call has been made.
- **The live audio path** (reconnection, the time limit, wrap-up) and the web pages that drive it.
- **A migration on real data.** The two migrations were tried on a development database. Existing users are assigned to the
  first organization, which is an assumption (spec 003); on production data that must be confirmed first.
- **Anything about deployment, load or security beyond a static scan** and the fixes listed in the audit.
- **The honesty of the audit table.** The gate checks its form, not whether a finding is rated correctly.
  That judgement is this document.
- **A flaw in the gate itself, found while writing this and fixed afterwards.** A criterion counted as verified by the
  pipeline when its text contained the words "Verified by", without regard to case or a colon, so a criterion that only
  mentioned the phrase was exempted from needing a test. It exempted one criterion by accident (008/AC-3), which does have
  tests, so the verdict above was right. Fixed in pull request #15 (spec 008, AC-10): only the exact marker `Verified by:`
  exempts a criterion. The gate still cannot judge whether a pipeline really verifies what the marker claims.

## 5. If someone decides to ship anyway

I would not, and I would not accept this on my own authority. If the business accepts the risk, it must be written in the
audit table as `Accepted`, with an owner and a reason, for each of the five findings, so the gate shows it instead of
hiding it. The mitigations above are the minimum: the PDF export for fit/gap, a production build made without the
development token and its output inspected, installs from a reviewed dependency list, and a manual walk through the web
app. **Until a named business owner accepts them, the owner of the risk is Fatih, with product as co-owner of MS-1 and
MS-2.**

## 6. Path to RELEASABLE

The gate is reusable: nothing in it changes for the next version. When a finding is fixed, its row says Fixed; the
gate then reads RELEASABLE on its own. The work, in the order of section 3: web harness with the contract test (A7,
PR-1b), the build check (A8), the lockfile (PR-2), then the specs for MS-1. Each follows the same loop as the fixes already
made: a spec, a test that fails for the right reason, the fix, and a run that passes.

## 7. How to read the status

- **On GitHub:** open the release page for the tag. Its title says `v1.0.0: BLOCKED` or `v1.0.0: RELEASABLE`, and the body
  lists the reasons. A blocked version is marked as a pre-release and never as the latest one, and the run on the tag is red.
- **Before tagging:** `node tools/release-check.js --tag v1.0.0 --tests passed` gives the same decision on any machine.
- **If the run on the tag disagrees with this document,** this document is wrong and must be corrected, not the run.

## 8. What I got wrong on the way

Running the gate on my own documents showed three mistakes of mine: a finding marked Fixed while its web half was still
open, two findings with wording the machine could not read, and 21 test tags that did not say which spec they belonged
to. The other mistakes that the process caught are listed in section 5 of `02-quality-system.md`. I list them because a
version that was judged only by the person who built it deserves less trust than one whose gate disagreed with its author
and was believed.

## 9. Update after the tag

This decision describes `v1.0.0` as tagged (commit `c0ebdbe`), and its release page still says what it said. After the
tag, PR-2 was fixed on `main` (pull request #17, spec 009: a committed lockfile, two tests on it and a `Web build` job that
installs with `npm ci`). The audit now lists four open P1 findings (A7, A8, PR-1b, MS-1), and the verdict for the next
version is still BLOCKED. On `main` after that change there are 33 gate tests and 52 criteria in nine specs (48 with a tagged test, 4 verified by the pipeline); the figures in
section 2 are those of the tag.

After that, A7 was fixed too (pull request #20, spec 010: the table follows the API, the API sends the override flag, a
shared sample of the fit/gap read is tested on both sides, and the release gate reads web tests). Three P1 findings are
open now: A8, PR-1b (only the fit/gap table has web tests) and MS-1. The verdict for the next version is still BLOCKED.

One more mistake of mine, caught by running the gate before writing this note: a web test for 011/AC-4 used a form that the
release check cannot read (`it.each`), so after pull request #22 the gate briefly reported a criterion without a test. The
test now uses a plain loop with the same cases and assertions; nothing was weakened.

Then A8 was fixed (pull request #22, spec 011: the development token is never given to a build, and a test builds the
app and searches the output). Two P1 findings are open now: PR-1b (only part of the fit/gap table, the token source and
the bundle have web tests) and MS-1 (behaviours nobody specified). The verdict for the next version is still BLOCKED.
