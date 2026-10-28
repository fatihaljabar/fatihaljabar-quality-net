# Spec 006: A skill becomes covered only on evidence

Status: proposed

## Spec

After every candidate turn a background job asks a model to judge how well each skill has been covered and
moves the coverage state forward: not yet, initiated, partial, covered. The product definition says a skill
becomes covered only when the model judges there is enough behavioural evidence to defend a level with
quotes from the transcript, and never before it has been probed twice.

The job also contains a second rule (audit finding A5). Any partial skill probed four times or more that was
not part of the latest exchange is moved to covered without any judgement, because it has fallen out of the
six-turn window the model sees. It does not matter whether the evidence was ever sufficient. The consequences
are data integrity problems:

- The interview can end early with "all skills covered", because the end-of-interview check reads these states.
- The skill is later stored with high confidence, because confidence is derived from the covered state.
- The assessor's live monitor shows "covered" for a skill nobody judged as covered.

Required behaviour: the only way to reach covered is a judgement by the model that passes the probe-count rule.
A skill that is not covered because nobody judged it stays partial, which is true.

In scope: the stale-partial rule in the coverage analyzer job. Out of scope: the model prompt, the size of the
window, the wrap-up logic of the websocket, and the portfolio, which already derives its confidence from the state.

Assumption (no spec existed): an honest partial is better than an early finish. When the interviewer has left a
partial skill behind, the interview continues until the model judges it covered, the interviewer returns to it, or
the time limit ends the session. The interviewer is already told to prioritise partial skills.

## Acceptance Criteria

- **AC-1** Given a partial skill probed five times that was not discussed in the latest exchange,
  When the analyzer job runs and the model proposes no change for it,
  Then the skill stays partial.
- **AC-2** Given a session whose only incomplete skill is that stale partial skill,
  When the job has run,
  Then the end-of-interview check does not report all skills covered.
- **AC-3** Given a partial skill probed at least twice,
  When the model proposes covered for it,
  Then it becomes covered.
- **AC-4** Given a skill probed once,
  When the model proposes covered for it,
  Then it does not advance past initiated.

## Design Plan

- `CoverageAnalyzerWorker`: remove `advance_stale_partials` and its call, with a short comment saying why a skill is
  never promoted without a judgement. Nothing else changes: the model's proposals still go through
  `Coverage::StateEngine`, which keeps the probe-count rule.
- Tests: `api/spec/workers/coverage_analyzer_worker_spec.rb`, tagged `[006/AC-n]`. The model call is stubbed with
  a fixed answer so nothing reaches the network, and the session has one transcript turn so the analyzer runs.
- Known limits: a partial skill that left the window can stay partial until the interviewer returns to it or the
  time limit ends the session, so some interviews will run to the limit instead of finishing early. A wider window
  or a periodic re-judgement would address that, and is a follow-up, not part of this spec.

## Definition of Done

- [ ] AC-1 and AC-2 fail before the fix and pass after, shown in the history; AC-3 and AC-4 keep passing.
- [ ] A5 marked fixed in the audit with a link to the tests, and the early-finish trade-off listed.
- [ ] The existing suite stays green.
- [ ] The assumption is written in the assessment notes with an owner.
- [ ] No company, product or client name appears in the change.
