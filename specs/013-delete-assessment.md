# Spec 013: Deleting an assessment says what happened

Status: proposed

## Spec

An assessment that already has interview sessions cannot be deleted: the model refuses, to protect the recorded
interviews (audit finding B2). The delete endpoint ignores that refusal and answers "Assessment deleted" with a success
status while nothing was deleted. The assessor believes the assessment is gone, and it is still listed and still usable.
A response that reports success for something that did not happen is a data honesty defect, small in effect but the same
kind as the larger ones fixed before.

Required behaviour: the endpoint reports success only when the assessment was deleted; when the model refuses, it answers
422 with the reason and the assessment is untouched.

In scope: the delete endpoint for assessments. Out of scope: how the web app shows the error (it already shows API error
messages), and deleting vacancies, which has no such refusal.

Assumption (no spec existed for deletion): an assessment with sessions must not be deleted, as the model already
says; deletion with a reason, or archiving, is a product decision left open.

## Acceptance Criteria

- **AC-1** Given an assessment that has a session,
  When an assessor deletes it,
  Then the response is 422 with the model's reason, and the assessment and its session still exist.
- **AC-2** Given an assessment with no sessions,
  When an assessor deletes it,
  Then the response is 200 "Assessment deleted" and the assessment is gone.
- **AC-3** Given an assessment of another company,
  When an assessor deletes it,
  Then the response is 404 and nothing is deleted.

## Design Plan

- `AssessmentsController#destroy`: call `destroy`; on a false result answer `json_error` with status 422 and the record's
  error messages, otherwise answer as before. No model or schema change.
- Tests: `api/spec/requests/assessment_delete_spec.rb`, tagged `[013/AC-n]`.
- Known limits: the message is the framework's text for the refusal; wording for assessors is a product decision.

## Definition of Done

- [ ] AC-1 fails before the fix and passes after, shown in the history; AC-2 and AC-3 keep passing.
- [ ] B2 marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
