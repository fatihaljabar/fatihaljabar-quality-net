# 01. Audit of the platform

Scope: the API (`api/`) and the web app (`web/`), read together and run together locally.
Severity language: the one in the brief, applied top to bottom, stopping at the first match.
Every item ends with its **final status** (fixed or remaining). IDs are stable: `A` for risks that were ranked,
`B` for smaller issues, `PR` and `MS` for missing inputs.

## 1. The five-minute version

The main path (an assessor sets up an interview, a candidate is interviewed by voice, a portfolio of skill levels is
produced, and a fit/gap report compares it with a vacancy) works on the happy path. What the product stores and shows
could not be trusted for a hiring decision, and one company could reach another company's candidate data.

What I found, in plain words:

1. **The service could not start in production.** Two independent mistakes meant the configuration used for
   deployment failed before serving a single request. Nobody saw it because development does not load the code the way
   production does and there were no tests or CI. (A10, P0)
2. **Company A could read and change company B's candidates.** The login endpoint signed a token for whichever company
   the caller named in a header, and the portfolio endpoints did not check the company at all. (A2 and A1, P1)
3. **Anyone holding an interview link could end the interview and record it as "all skills covered",** even if it had
   never started. A portfolio was then produced from an empty transcript. (A3, P1)
4. **The portfolio stored whatever the language model said.** A missing level became level 1, so a candidate nobody
   examined on a skill could be reported as a "Gap". Confidence was taken from the model although the product
   definition derives it from the interview data. (A4, P1)
5. **Skills were promoted to "covered" without any judgement,** which could end an interview early and raise the
   confidence shown. (A5, P1)
6. **Rebuilding a fit/gap report deleted the old one first,** had no failed state, and queued a new job every five
   seconds while a page waited. (A6, P1)
7. **Two web defects remain:** the fit/gap table shows an empty "Required" column because the web and the API name the
   field differently, and a development login token can end up inside the production bundle. (A7 and A8, P1)

Underneath all of it: there were no tests, no CI, no written acceptance criteria and no design plan for any feature,
so nobody could say whether anything was correct. That is the real finding; the rest are its consequences.

**Ship line.** Do not ship until the P0 and every P1 that touches data or other companies' data is fixed and guarded
by an automated check. As of this report: the P0 and A1 to A6 are fixed, each with a failing test committed before the
fix and a passing run after. **A7 and A8 remain, so the honest answer for this version is: not ready to ship to a
client.** The release decision (`03-release-decision.md`) states what is gated and who owns the remaining risk.

## 2. How the platform was assessed

- **Read:** the API and web source, the schema and migrations, deployment manifests, the three READMEs, the two product
  documents (PRD 01, behaviour of the interviewer; PRD 02, an end-to-end simulation) and the four closed tickets.
- **Ran it:** API, worker, database and Redis in containers, and the web app built and served locally. Each finding
  marked "reproduced" was triggered on running code, not only read.
- **Not done:** no real language-model call was made (a placeholder key was used), so anything that depends on the
  model's actual answers is reasoned about, not observed. The live audio pipeline was not exercised end to end.
- **Static security scan** before running anything: no install hooks, no unusual dependency sources, no obfuscated or
  shell-executing code, no secrets in the files or in the history, no text aimed at an automated reader.

## 3. The pattern behind the issues

| Pattern | Why it recurs | Items |
|---|---|---|
| **Trust boundaries fail open** | Tenancy is enforced by convention (a default scope on three models; child tables have no tenant column; `unscoped` in several places) instead of by a mechanism that refuses by default. | A1, A2, A3, A9 |
| **Model output is treated as data** | Rules the product defines exactly (confidence from the interview, "covered needs evidence", a level needs a basis) live in a prompt, while the code stores the answer. | A4, A5 |
| **Delete first, rebuild asynchronously, no failed state** | A background rebuild can fail, and nothing records that or protects the old result. | A6, B3 |
| **The web and API contract is hand-written** | Types are copied by hand, with `any` casts, and no test compares the two sides. | A7, B6 |
| **Tickets closed without evidence** | Closed tickets with unchecked acceptance criteria and no test, so the defect was free to return. | B1 |
| **Nothing loaded the other environments** | No test or CI ever booted production or eager-loaded the code. | A10 |

## 4. Ranked risks

Reproduced means I triggered it on running code. Category: **BW** built wrong (a definition exists and the build does
not match it), **MS** missing or ambiguous spec (never defined), **PR** a missing input to the process.

| # | ID | Sev | Cat | Impact (who or what is hurt) | How found | Final status |
|---|---|---|---|---|---|---|
| 1 | A10 | P0 | BW | The API cannot start with the production configuration; no function is available. | Booted `RAILS_ENV=production`: `NoMethodError` on a setting for an unloaded component; then an eager-load `NameError` on two misnamed middleware classes. Reproduced locally and in CI. | **Fixed** (PR #4) |
| 2 | A2 | P1 | BW | Any admin can obtain a valid token for any other company and get full access to it. | Logged in with another company's scheme in a header: token issued, other company's data returned. Reproduced. | **Fixed** (PR #5) |
| 3 | A1 | P1 | BW | Any company can read (portfolio, evidence quotes, fit/gap, exports) and change (level override) another company's candidate data by id; error messages reveal which ids exist. | Called export, override and fit/gap with another company's ids. Reproduced. | **Fixed** (PR #5) |
| 4 | A3 | P1 | BW | An interview link can end a session that never started, stores a false end reason and creates a portfolio from nothing. | Called the unauthenticated endpoint on a pending session: ended as "all covered". Reproduced. | **Fixed** (PR #6) |
| 5 | A4 | P1 | BW | Hiring decisions can rest on invented levels and confidence; a skill nobody examined can show as a "Gap". | Read the generator; reproduced the stored values with a scripted stand-in for the model. | **Fixed** (PR #7); a display follow-up remains |
| 6 | A5 | P1 | BW | An interview can end early as "all covered" and the skill gets high confidence without any judgement. | Read the job; compared the original and fixed code on the same data. Reproduced. | **Fixed** (PR #8); trade-off open |
| 7 | A6 | P1 | BW | A failed rebuild loses the assessor's fit/gap report; a waiting page queues a job every five seconds; a failed job spins forever. | Stopped the worker and saved an override: report gone; repeated polls: four jobs for one report. Reproduced. | **Fixed for data and API** (PR #9); the page part remains |
| 8 | A7 | P1 | BW | The fit/gap table's "Required" column is empty, so a Gap or Exceed cannot be interpreted; the PDF is right and the screen is wrong. | API returns `expected_level`, the web reads `required_level`. Reproduced on the API response; not yet seen in a browser. | **Remaining** |
| 9 | A8 | P1 (conditional) | BW | A development login token set at build time ends up in the public bundle and lets any visitor past the login gate. | Built with a marker token: it appears in two bundle files. Reproduced. | **Remaining** |
| 10 | PR-1 | P1 | PR | No tests, CI, acceptance criteria or design plan: nobody can say whether anything is correct. | Repository survey. | **Fixed for the API** and the process; **remaining for the web** (no web tests) |
| 11 | PR-2 | P1 | PR | No npm lockfile: dependency versions float, builds are not reproducible. | Repository survey. | **Remaining** |
| 12 | MS-1 | P1 | MS | No spec for tenant isolation, roles, signup, vacancies, overrides, regeneration, error states, retention of candidate transcripts and audio, or editing an assessment after sessions exist. | Compared the product documents with the code. | **Partly addressed:** specs 003 to 007 define what was fixed; the rest remains |
| 13 | MS-2 | P1 | MS | The product documents do not say what a portfolio or fit/gap shows for a skill with no evidence or an interview that ended early; it was left to the model. | Compared the documents with the generator. | **Assumption written** (spec 005), awaiting product |
| 14 | A9 | P2 (lowered from P1 after testing) | BW | Tenant resolution can fall back to a default organization and stays open without a tenant in context. | Read the code, then tested: not reproduced here because the database has no default organization. May apply in production. | **Remaining** |
| 15 | B1 | P2 | BW, PR | Closed tickets were never fixed: unknown routes return an HTML error page, and edit pages show an empty form for a record that does not exist. | Checked each closed ticket against the code. | **Remaining.** A JSON 404 change was written as the demonstration of the gate being blocked and is deliberately not merged |
| 16 | B2 | P2 | BW | Deleting an assessment that has sessions reports success while nothing is deleted. | Read the controller. | **Remaining** |
| 17 | B3 | P2 | BW | Regenerating a portfolio is not atomic and removes assessor overrides; reachable only after a failure. | Read the generator. | **Remaining** (latent) |
| 18 | B4 | P2 | MS | Editing an assessment after interviews changes the definitions used to build their portfolios. | Read the generator. | **Remaining** |
| 19 | B5 | P2 | BW | Any 401 or 403 in the web logs the user out and redirects to login, including "forbidden", which can loop. | Read the HTTP client. | **Remaining** |
| 20 | B6 | P2 | BW | If the candidate page cannot load its details, it shows the "interview complete" screen. | Read the page. | **Remaining** |
| 21 | B7 | P2 | BW, MS | Discovered skills start at a probe count of one, are not in the priority order and can hold an interview open; the documents disagree on how they are modelled. | Compared the code with both documents. | **Remaining** |
| 22 | B9 | P2 | BW | Duplicate skill labels in a vacancy overwrite each other in the fit/gap comparison. | Read the engine. | **Remaining** |
| 23 | B10 | P2 | MS, BW | The signup page calls an endpoint that does not exist, is not routed, and offers an "Admin" role. | Read the page and routes. | **Remaining** |
| 24 | B11 | P2 | BW | The sample configuration allows any CORS origin; the API refuses to start without the setting. | Read the configuration. | **Remaining** |
| 25 | B12 | P2 (hypothesis) | BW | The hardware check may be blocked in production by the content security policy. | Compared the policy with the speed-test calls. | **Remaining**, not verified |
| 26 | MS-3 | P2 | MS | The two product documents contradict each other (see section 6). | Read both. | **Remaining** |
| 27 | B8 | P3 | BW | The coverage map is injected differently from the document (channel and wording). | Compared the code with the document. | **Remaining**, not verified at runtime |
| 28 | B13 | P3 | BW | Documentation drift: ports, folder names, a variable name, a framework version, a route name. | Read the READMEs against the code. | **Remaining** |

The first column is the rank. Within a severity, items that touch data across companies come first, then data that is
wrong underneath, then the rest.

## 5. The P0 and P1 items in detail

**A10, P0: the API cannot boot in production.** The production configuration sets a queue adapter for a framework
component that is never loaded, so it raises on start. Behind it, two middleware classes were named with a capital
letter that their file names do not produce, so loading all code, as production does, raises again. The deployment
manifests set the production environment, so no function was available. It was invisible because development
loads code lazily and nothing ever booted another environment. The first CI run of the new test suite found the
second cause by itself. Fixed by removing the unused setting and renaming the classes; a boot check that loads all
code and boots production now runs on every pull request.

**A2 and A1: one company reaching another.** Users belong to no company, so login took the company from a client
header (or the first company in the table, or a hard-coded name) and signed a token for it. Separately, portfolios,
skills, reports and overrides were fetched by id with no company check, because those tables have no company column and
only sessions, assessments and vacancies were scoped. Together: ask for another company's token, then use it
legitimately. Fixed by tying users to a company and refusing a mismatch with the same message as a wrong password, and
by scoping the four tables through the already scoped session, so another company's id answers 404 exactly like an id
that does not exist.

**A3: ending an interview with a false reason.** The candidate's page calls an endpoint with the invite token only.
It ended whatever it was given and always recorded "all covered". A session that was never started could be closed
by anyone with the link, and an incomplete interview was recorded as complete. Fixed: only a running session can be
ended this way, and the reason is derived from the interview data (`all_covered`, otherwise `manual_candidate`).

**A4 and A5: what the portfolio claims.** The generator stored the model's level and confidence as given. A missing
level became level 1 and out-of-range numbers were silently clamped; the model could add skills the interview never
reached; confidence ignored the interview data that the product definition uses. Fixed: a skill is stored only if the
interview reached it and the level is valid; confidence is computed from the interview data in one place. A5 is the
neighbour: a rule promoted any partial skill probed four times to "covered" without judgement, which could end the
interview early and raise confidence. Removed; a skill is covered only on the model's judgement. The cost, stated
openly: some interviews will now run to the time limit instead of finishing early.

**A6: the fit/gap report.** Fixed for data and API: a rebuild never deletes the report, it marks it pending, a second
request while one is waiting queues nothing, a failed rebuild is recorded with its error, and the previous report stays
readable. Remaining: the page does not yet show the failed or updating state.

**A7 and A8 (remaining).** A7 is a field-name mismatch between the two services (`expected_level` on the API,
`required_level` in the web types and table). A8 is a build-time variable that is also a fallback login token; if it is
set for a production build, it is embedded in the public files. Both need a web test harness, which does not exist yet.

## 6. Missing or ambiguous spec versus built wrong

**Built wrong** (a definition exists and the build does not match): A10, A1 to A9, B1 (the tickets define the behaviour),
B2, B3, B5 to B9, B11, B12, B13.

**Missing or ambiguous spec** (nobody defined it, so nobody can say what correct is): MS-1, MS-2, MS-3, B4 and B10.
Each is a risk in its own right. The ones that mattered most:

- No definition of company isolation or roles, which is why A1 and A2 could exist unnoticed.
- No definition of what a portfolio or fit/gap shows for a skill with no evidence, which left A4 to the model.
- The two product documents disagree: the worked example gives a "medium" confidence where the rule gives "high";
  its timestamps do not add up; "discovered" is both a state and a flag; the endpoint paths differ from the real API.
  Where they conflict I followed the rule document and wrote it down as an assumption.
- Nothing says how long transcripts and audio of candidates are kept, or who may read them.

Missing inputs are first-class here: no feature had a spec with acceptance criteria and a design plan, which is
required for a change to be ready to build. That is what the workflow gate in `02-quality-system.md` enforces.

## 7. What works

- Login, a wrong password and missing or forged tokens behave correctly (401).
- Sessions are scoped to their company, and a request for another company's session answers 404.
- Ending a session as an assessor stores the outcome and queues the portfolio job exactly once.
- A fit/gap report for a skill the portfolio does not contain is reported as "not assessed", not as a gap.
- The web app type-checks and builds; the health endpoints answer.
- The deployment manifests and the browser security headers exist. I read them only briefly, so this is not a review of them.

## 8. Not covered by this audit

The live model client and most of the audio websocket (reconnection, time limit, wrap-up), the prompt compiler beyond a
skim, the PDF generator beyond checking that overrides are applied, the skill catalogue endpoints, most web pages
(interview, live monitor, assessment pages, hardware check), and everything that depends on real model output.

## 9. Assumptions and decisions that need an owner

| Assumption | Where | Owner |
|---|---|---|
| Existing users belong to the first non-default organization (what login implicitly did). | Spec 003 | Fatih, with product |
| An interview ended from the candidate page before all skills are covered is stored as `manual_candidate`. | Spec 004 | Fatih, with product |
| A skill that was not assessed is represented by no portfolio skill, and the confidence rule of the behaviour document governs over the example in the simulation document. | Spec 005 | Fatih, with product |
| An honest "partial" is preferred over finishing an interview early without evidence. | Spec 006 | Fatih, with product |
| While a fit/gap rebuild runs, the previous report stays visible and is marked pending. | Spec 007 | Fatih, with product |
| The brief gives both three to four days and three to five days; the deadline shown on the platform governs. | Brief | Fatih |

## 10. Status at the time of writing

Fixed: A10 (P0), A1, A2, A3, A4, A5, A6 (data and API). Remaining P1: A7, A8, PR-2, and the web part of PR-1.
Remaining P2 and P3: all of section 4 marked remaining. Each fixed item has its spec in `specs/`, a failing test
committed before the fix, a passing CI run after it, and a merge that keeps both in the history.
