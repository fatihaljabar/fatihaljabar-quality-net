# Spec 007: Fit/gap regeneration never loses a report and never loops

Status: proposed

## Spec

A fit/gap report is rebuilt in the background when an assessor saves an override, asks to regenerate, or opens the
page for a vacancy that has no report yet. Today the three paths do not agree (audit finding A6):

- The override and regenerate paths delete the existing report first and queue the rebuild afterwards. If the
  rebuild fails, the assessor's report is gone, and there is nowhere to record why.
- A report has no status. The page polls every five seconds, and each poll that finds no report asks for a new
  one, so one waiting page queues a new job every five seconds. A job that fails for good leaves the page
  spinning forever, because nothing can say it failed.

Required behaviour: a report is replaced, never deleted first; the report says whether it is pending, being
generated, complete or failed, and why; asking again while a rebuild is already waiting queues nothing new.

In scope: the report record, the three request paths, the generation job and the read endpoint. Out of scope:
the fit/gap rules and the model prompt, the portfolio, and every web change. The page is not changed, so it keeps
its present behaviour; showing the failed and updating states is a follow-up.

Assumption (no spec existed): while a rebuild is running the assessor keeps seeing the previous report rather than
a spinner, and the report says it is pending so a later page version can label it.

## Acceptance Criteria

- **AC-1** Given a complete report,
  When an assessor saves an override on a skill of the portfolio, or asks to regenerate,
  Then the report is kept with its previous comparisons, is marked pending, and exactly one job is queued.
- **AC-2** Given a report that is pending or being generated, or no report at all,
  When the page asks for a report again, as it does every five seconds,
  Then no further job is queued, and no more than one report exists for the pair.
- **AC-3** Given a job that succeeds,
  When it finishes,
  Then the report holds the new comparisons, is complete, and has no error.
- **AC-4** Given a job that fails for good after its retries,
  When it is given up,
  Then the report is marked failed with the error and keeps its previous comparisons.
- **AC-5** Given a failed report,
  When it is read,
  Then the answer is 200 with the generation status and the error, never 404.
- **AC-6** Given a report that has never produced comparisons and is pending or being generated,
  When it is read,
  Then the answer is 404, so the existing page keeps its spinner.

## Design Plan

- Migration: `fit_gap_reports.generation_status` using the existing `generation_status` type, default `complete` so
  existing rows stay valid, and `generation_error` text. `skill_comparisons` gets a default of an empty list so a
  pending row can exist before its first generation, and the model's presence validation, which rejects an empty
  list, is replaced by a not-null check.
- `FitGapReport.request!(portfolio:, vacancy:)`: inside a transaction, lock or create the row for the pair. If it is
  pending or being generated, return it without queuing. Otherwise mark it pending, clear the error and queue one job
  after the transaction commits. The fit/gap create path, the regenerate path and the override path all call it, and
  nothing destroys a report any more.
- `FitGapGeneratorWorker`: mark the report as being generated when it starts; `FitGap::Engine` marks it complete and
  clears the error when it saves; `sidekiq_retries_exhausted` marks it failed with the message, the same pattern
  `PortfolioGeneratorWorker` already uses. Intermediate retries leave it as being generated.
- Read endpoint: 404 when there is no row, or when the row is pending or being generated and has never produced
  comparisons; otherwise 200 with the existing fields plus `generation_status` and `generation_error`. The new
  fields are additive.
- Tests: request specs for AC-1, AC-2, AC-5 and AC-6, worker specs for AC-3 and AC-4, tagged `[007/AC-n]`. The model
  is a fake; jobs are captured by Sidekiq's fake mode.
- Known limits: the page still treats only 404 as "waiting", so a failed or updating report is shown as an ordinary
  report until the page is changed, and a page opened on a failed report with no previous comparisons shows an empty
  table. A failed rebuild is retried only when someone asks again. The user interface follow-up is listed as remaining.

## Definition of Done

- [ ] Each acceptance criterion has a test that fails before the fix and passes after, shown in the history.
- [ ] A6 marked fixed for the data and API part in the audit, with the page follow-up listed as remaining.
- [ ] The existing suite stays green and the migration runs on an existing database with reports.
- [ ] The assumption is written in the assessment notes with an owner.
- [ ] No company, product or client name appears in the change.
