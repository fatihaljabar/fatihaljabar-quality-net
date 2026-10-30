# 03. Release decisions

Three versions were put through the release gate. The latest decision is the one that stands.

| Version | Decision | Where |
|---|---|---|
| **v1.2.0** (latest) | **RELEASABLE WITH 3 ACCEPTED RISKS** | section 11 |
| v1.1.0 | RELEASABLE WITH 3 ACCEPTED RISKS | section 10 |
| v1.0.0 | **BLOCKED**: five open P1 findings | sections 1 to 9 |

Decision owner for all three: Fatih, as the owner of the engineering quality gate. Sections 1 to 9 describe v1.0.0 as it was
tagged and stay as they were; sections 10 to 12 say what changed afterwards. "Accepted risk" means a P1 finding that was not fixed
and is listed with a named owner; it is never a clean release.

## v1.0.0: BLOCKED (decided 2026-10-29)

| | |
|---|---|
| **Decision** | **BLOCKED. Do not release this version to a client.** |
| Gate verdict | BLOCKED, five open P1 findings. Dry run on `main`: [run 40841198699](https://github.com/fatihaljabar/fatihaljabar-quality-net/actions/runs/40841198699). The run on the tag gave the same verdict. |

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
made: a spec, a test that fails for the right reason, the fix, and a run that passes. That is what happened: sections 9 to 11.

## 7. How to read the status

- **On GitHub:** open the release page for the tag. Its title says `v1.x.x: BLOCKED` or `v1.x.x: RELEASABLE`, and the body
  lists the reasons; for a releasable version with accepted risks its first sentence says "Releasable with N accepted risks. It is not a clean release". A blocked version is marked as a pre-release and never as the latest one, and the run on the tag is red.
- **Before tagging:** `node tools/release-check.js --tag v1.2.0 --tests passed` (any version) gives the same decision on any machine.
- **If the run on the tag disagrees with this document,** this document is wrong and must be corrected, not the run.

## 8. What I got wrong on the way

Running the gate on my own documents showed three mistakes of mine: a finding marked Fixed while its web half was still
open, two findings with wording the machine could not read, and 21 test tags that did not say which spec they belonged
to. The other mistakes that the process caught are listed in section 5 of `02-quality-system.md`. I list them because a
version that was judged only by the person who built it deserves less trust than one whose gate disagreed with its author
and was believed.

## 9. Update after the tag

This decision describes `v1.0.0` as tagged (commit `c0ebdbe`), and its release page still says what it said. Afterwards three of
the five blocking findings were fixed: PR-2 (pull request #17, a committed lockfile installed with `npm ci`), A7 (pull request #20,
the table follows the API, the API sends the override flag, and both sides are tested against one shared sample) and A8 (pull request
#22, the development token is never given to a build and a test builds the app and searches the output). The figures in section 2 are
those of the tag; the later versions have their own sections.

One more mistake of mine, caught by running the gate before writing a note: a web test for 011/AC-4 used a form the release check
cannot read (`it.each`), so the gate briefly reported a criterion without a test. The test now uses a plain loop with the same cases
and assertions; nothing was weakened.

## 10. Decision for v1.1.0: releasable with three accepted risks

| | |
|---|---|
| **Decision** | **RELEASABLE WITH ACCEPTED RISKS.** Not a clean release: three P1 findings are accepted, not fixed (PR-1b and MS-1 in this version, MS-2 since v1.0.0). |
| Gate verdict | RELEASABLE, read from the audit table and the specs by `tools/release-check.js`; the run on the tag must say the same, and this document is wrong if it does not. |
| Decision owner | Fatih |

**What changed since v1.0.0.** Three of the five blocking findings were fixed, each with a test that failed before the fix
and passes after: A7 (the empty "Required" column), A8 (the development token in the bundle) and PR-2 (the lockfile). The
other two, PR-1b and MS-1, were not fixed. They are accepted in the audit table with a named owner, which is the only way
the gate lets a P1 through. The gate lists them on the release page.

**The two risks accepted in this version, in plain words** (the third, MS-2, was accepted in v1.0.0, see section 2).

| ID | What is not covered | Who is hurt | Why accepted instead of fixed | Conditions I recommend |
|---|---|---|---|---|
| PR-1b | Most web pages (interview, live monitor, assessment, vacancy, hardware check) have no tests. Only the fit/gap table, the source of the login token and the production bundle do. | Everyone who uses a page that regresses unnoticed. | The other pages have no written behaviour to test against; tests written from the current code would only freeze whatever it does, including its mistakes. | A manual walk through the main screens before each deployment, and a test added with every web change from now on (the gate already requires it). |
| MS-1 | Roles, signup, vacancies, retention of candidate transcripts and audio, and editing an assessment after interviews were never specified. | Candidates, whose data is kept for an undefined time; companies, whose staff roles are undefined. | They need a product decision. A spec written by guessing would invent requirements and then be tested as if it were fact. | Use with real candidates only as a trial where they are told how their data is handled; a client rollout only after product defines retention and roles, as specs. |

The conditions are my recommendation; the acceptance and its conditions are Fatih's decision, and a business owner can
replace them. **If the business does not accept these risks, the honest state is that the version stays blocked**, and the
audit table must say `Remaining` again.

**Why I am willing to put my name to this, and where I would not.** The risks accepted here cannot be closed by more code in
this exercise: one needs a decision that is not mine, the other needs behaviour that nobody wrote down. Every finding that
corrupts or leaks data was fixed and is guarded; none of the accepted ones does. I would not accept a finding that touches
company isolation or stored levels in this way, and the gate would not let me hide one: it reads the table, and an acceptance
without an owner blocks.

**What the gate still cannot see** (unchanged from section 4): the language model itself, the live audio path, a migration on
production data, deployment and load, and whether a finding is rated correctly. It also cannot judge whether an acceptance is
wise; it only refuses an acceptance that has no owner.

## 11. Decision for v1.2.0: releasable with the same accepted risks

| | |
|---|---|
| **Decision** | **RELEASABLE WITH ACCEPTED RISKS**, the same three as v1.1.0: PR-1b, MS-1 and MS-2. No P1 finding is open. |
| Gate verdict | RELEASABLE as read by `tools/release-check.js`; the run on the tag must say the same, and this document is wrong if it does not. |
| Decision owner | Fatih |

**What changed since v1.1.0.** The smaller findings of the audit were fixed, each with a failing test pushed before the fix (the
list is in section 11 of `01-audit.md`), and one more P1 was found and fixed on the way: **B14**, candidate invite links that
opened the API instead of the web app. It was found while checking the documentation, was fixed in the same way as the others
and is marked Fixed in the audit. It also shows why the finding stayed on the list: with the documented configuration, the
main objective of the product (a candidate reaching the interview) was only met if someone set one variable by hand.

**What is not the same as before.**

- PR-1b stays accepted, but the reason is narrower: the web app now has tests for the places where a defect was found and a
  check that every request it makes has an API route; the audio hooks, the hardware check, the forms and the other screens are
  still untested.
- MS-1 and MS-2 are unchanged. They still need product decisions.
- Six smaller findings remain open on purpose (A9b, B4, B7, B8, B12, MS-3), each with its reason in the audit.

**Read this before deploying.** Four changes touch configuration and behaviour that an operator would notice:

1. `APP_BASE_URL` must be the address of the web app, because it builds the candidate invite links. A deployment that set it to the
   API's address must change it, or candidates keep landing on the API.
2. `ALLOWED_ORIGINS` must list the web app's origin in production. An empty value or `*` now stops the boot with a message that names
   the variable.
3. A request that names an unknown tenant is refused with 403, even where a default organization exists.
4. Deleting an assessment that has interviews answers 422 instead of reporting success.

**What the gate still cannot see** is unchanged (section 4): the language model itself, the live audio path, a migration on real
data, deployment and load, and whether a finding is rated correctly.

## 12. After v1.2.0

Two flaws of the gate itself were found and fixed without a new tag (pull requests #41 and #42, specs 008 AC-11 and 027): the report
of a releasable version now says it carries its accepted risks instead of saying it passed every check, and a release dry run no
longer cancels the `API tests` run of the merge commit on `main`. The published release pages were not edited, so the first
sentence of the v1.1.0 and v1.2.0 pages is the old one; the next release or a dry run shows the new one.
