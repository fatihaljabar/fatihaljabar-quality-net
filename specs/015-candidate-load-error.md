# Spec 015: The candidate page does not say "interview complete" when it could not load

Status: proposed

## Spec

The candidate opens the interview link and the page asks the API for the session. If that request fails for any reason
(the network drops, the server is down, the link is wrong), the page treats the failure as "the interview is over" and
shows "Interview Complete: thank you, the interview has been recorded" (audit finding B6). The candidate leaves believing
the interview happened and was saved, when nothing was recorded and nobody will follow up. For a candidate this is the most
harmful screen the product can show by mistake.

Required behaviour: when the session cannot be loaded, the page says so, tells the candidate what to do, and never shows the
completion screen. The completion screen stays for a session that really ended.

In scope: what the page shows when loading the session fails. Out of scope: automatic retry, the wording design, and the
other candidate screens.

Assumption (no spec existed): a failed load shows a plain message asking the candidate to check the link and connection
and to reload the page; a retry button is a design decision left open.

## Acceptance Criteria

- **AC-1** Given a candidate page whose session request fails,
  When the page has handled the failure,
  Then it shows a message that the interview could not be loaded, and it does not show "Interview Complete".
- **AC-2** Given a session that has ended,
  When the page loads it,
  Then it shows "Interview Complete".
- **AC-3** Given a session that has not started,
  When the page loads it,
  Then it shows neither "Interview Complete" nor the load error.

## Design Plan

- `InterviewPage`: a separate flag for a failed load, set in the failure handler instead of setting the state to complete;
  while it is set the page renders the error message and nothing else. The interview states are unchanged.
- `InterviewPage.test.tsx`: renders the page in a router with the session request, the audio hooks and the hardware check
  replaced by stand-ins, tagged `[015/AC-n]`.
- Known limits: the message is plain text with no retry button; a reload is the retry.

## Definition of Done

- [ ] AC-1 fails before the fix and passes after, shown in the history; AC-2 and AC-3 keep passing.
- [ ] B6 marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
