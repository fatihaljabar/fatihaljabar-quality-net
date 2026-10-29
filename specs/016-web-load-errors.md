# Spec 016: A page for a record that cannot be loaded says why, not an empty form

Status: proposed

## Spec

Three admin pages open a record by the id in the address: edit a vacancy, edit an assessment, and the assessment's invite
page. When the record does not exist, or the request fails, each of them swallows the error and shows its normal page with
nothing in it: an empty form, or an invite page called "—" with an "Invite Candidate" button (audit finding B1, tickets
#2 and #4 of the source project, both closed without a fix). An assessor can type into the empty form and press save, or
create an invite for a record that is not there. Nothing says that the address was wrong, that the record was deleted, or
that the user is not allowed to see it.

Required behaviour: when the record cannot be loaded, the page shows one clear message and nothing that looks like the
record. The message tells apart a record that does not exist (404), one the user may not see (403), one that cannot be
used in its present state (422), and any other failure.

In scope: a small message component and the function that chooses the text, used by these three pages. Out of scope:
the other three pages from the tickets (live monitor, portfolio, fit/gap report), which follow in their own spec, the
wording design, and automatic retry.

Assumption (the tickets give the three statuses but not the texts): plain sentences, no retry button; a link back to the
list is the way out.

## Acceptance Criteria

- **AC-1** Given an error from the API with status 404, 403, 422, or anything else or none,
  When the message is chosen,
  Then each of the four cases gets its own sentence, and a 404 says the item was not found.
- **AC-2** Given a vacancy that does not exist,
  When its edit page loads,
  Then it shows the not found message and no edit form.
- **AC-3** Given an assessment that does not exist,
  When its edit page loads,
  Then it shows the not found message and no edit form.
- **AC-4** Given an assessment that does not exist,
  When its invite page loads,
  Then it shows the not found message and no invite button.
- **AC-5** Given a record the user may not see (403),
  When its page loads,
  Then it shows the permission message, not the not found message.
- **AC-6** Given a vacancy that exists,
  When its edit page loads,
  Then it shows its form with the record's values.

## Design Plan

- `web/src/lib/loadError.ts`: `loadErrorMessage(error)` reads the status from an axios-style error and returns the sentence
  for 404, 403, 422 or the generic case.
- `web/src/components/LoadError.tsx`: renders the sentence in an alert, with a link back to the list.
- The three pages keep the error in state instead of swallowing it, and render the component in place of their content
  when it is set. Their success paths are unchanged.
- Tests: `loadError.test.ts` for AC-1 and one test file per page with the service module replaced by stand-ins, tagged
  `[016/AC-n]`.
- Known limits: the three other pages of the tickets are not covered here; a status other than the four listed gets the
  generic sentence.

## Definition of Done

- [ ] AC-1 to AC-5 fail before the fix and pass after, shown in the history; AC-6 keeps passing.
- [ ] B1 in the audit says which pages are fixed and which remain.
- [ ] No company, product or client name appears in the change.
