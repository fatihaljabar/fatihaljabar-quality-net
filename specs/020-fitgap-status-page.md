# Spec 020: The fit/gap page shows when a report is being updated or has failed

Status: proposed

## Spec

Since spec 007 the API keeps the previous fit/gap report while a new one is being built, and marks the report pending,
being generated, complete or failed, with the error when it failed. The page does not use any of that (audit finding A6-UI).
It treats the answer as a finished report, stops polling and shows the comparisons, so an assessor who has just saved an
override sees the old numbers with no sign that they are about to change, and the page never refreshes itself. A report
that failed shows its old table, or an empty table when it never had one, with no word about the failure.

Required behaviour: while the report is pending or being generated the page says it is being updated, keeps showing the
previous comparisons, and keeps checking until the status changes; a failed report shows its error and still allows
regenerating, and never an empty table.

In scope: how the fit/gap report page reads the status and error fields that the API already sends. Out of scope: the API, the
wording design, and the portfolio page.

Assumption (spec 007 left this to a later page version): while an update runs the assessor keeps seeing the previous
comparisons, labelled as being updated, rather than a spinner.

## Acceptance Criteria

- **AC-1** Given a report that is pending or being generated and holds previous comparisons,
  When the page loads it,
  Then it shows the previous comparisons and a notice that the report is being updated, and it keeps checking for a change.
- **AC-2** Given a failed report that holds previous comparisons,
  When the page loads it,
  Then it shows the error and the previous comparisons, and the regenerate button is available.
- **AC-3** Given a failed report that never had comparisons,
  When the page loads it,
  Then it shows the error and no comparison table.
- **AC-4** Given a complete report,
  When the page loads it,
  Then it shows the comparisons with no update notice and no error, and it does not keep checking.

## Design Plan

- `FitGapReport` type: add `generation_status` and `generation_error`, both optional so older answers still type-check.
- `FitGapReportPage`: derive "updating" from the status of the loaded report; the polling condition becomes the first
  generation or an update in progress. A notice is shown above the table while updating; an error box with the API's
  message replaces the table when it failed without comparisons, and sits above it when comparisons exist.
- Tests: `FitGapReportStatus.test.tsx`, tagged `[020/AC-n]`, with the services replaced by stand-ins and the polling hook
  replaced by a recorder of its arguments.
- Known limits: a failed rebuild is retried only when the assessor presses regenerate, as spec 007 says; the page does not
  retry by itself.

## Definition of Done

- [ ] AC-1 to AC-3 fail before the fix and pass after, shown in the history; AC-4 keeps passing.
- [ ] A6-UI marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
