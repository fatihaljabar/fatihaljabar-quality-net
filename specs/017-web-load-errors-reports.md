# Spec 017: The report pages say why a record could not be loaded

Status: proposed

## Spec

Spec 016 fixed the pages that open a record for editing. The same finding (B1, tickets #2 and #4) names four more pages that
open a record by the id in the address: the live monitor, the portfolio page, the fit/gap report and the transcript. They
fail in the same way or in a milder one:

- The live monitor, the portfolio page and the fit/gap report swallow a failed load (the monitor does not even catch it, so
  the browser logs an unhandled error) and show a normal page with nothing in it.
- The transcript page already shows a failure message, but one sentence for every kind of failure, so a record that does
  not exist, one the user may not see and a network error all read "Failed to load transcript. Please refresh."

Required behaviour: each of these pages shows the sentence from spec 016 for the kind of failure and nothing that looks
like the record.

In scope: the initial load of these four pages. Out of scope: the polling of the live monitor and of the report pages after
they have loaded, the fit/gap report that does not exist yet (a 404 there means "still being prepared" and stays that way),
and the wording design.

## Acceptance Criteria

- **AC-1** Given a session that does not exist,
  When the live monitor loads,
  Then it shows the not found message and not the monitor.
- **AC-2** Given a session that does not exist,
  When the portfolio page loads,
  Then it shows the not found message and not the portfolio page.
- **AC-3** Given a session that does not exist,
  When the fit/gap report page loads,
  Then it shows the not found message and not the report page.
- **AC-4** Given a session that does not exist,
  When the transcript page loads,
  Then it shows the not found message, not a generic failure sentence.
- **AC-5** Given a session the user may not see (403),
  When the portfolio page loads,
  Then it shows the permission message.
- **AC-6** Given a session with a transcript,
  When the transcript page loads,
  Then it shows the turns, as before.

## Design Plan

- The four pages keep the load error in state, as the pages of spec 016 do, and render the `LoadError` component of that
  spec in place of their content. The monitor gets a catch it did not have. The transcript page replaces its boolean
  with the error. Success paths are unchanged.
- Tests: one test file per page with the services, the polling hook and the coverage socket replaced by stand-ins, tagged
  `[017/AC-n]`; rejections are made by plain functions.
- Known limits: a failure after the first load, such as a poll that fails later, is still silent; the fit/gap report keeps its
  rule that a 404 for the report means it is being prepared.

## Definition of Done

- [ ] AC-1 to AC-5 fail before the fix and pass after, shown in the history; AC-6 keeps passing.
- [ ] B1 marked fixed in the audit for the pages of both specs.
- [ ] No company, product or client name appears in the change.
