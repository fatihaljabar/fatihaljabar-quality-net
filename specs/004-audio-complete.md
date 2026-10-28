# Spec 004: Ending a session from the candidate link

Status: proposed

## Spec

The candidate page calls `POST /api/v1/sessions/:token/audio_complete` after the interviewer has said goodbye
and the audio has finished playing. The call is made with the invite token only, no login. Today it ends
any session it is given and records the reason `all_covered` without looking at anything (audit finding A3):

- A session that was never started can be closed by anyone who holds the link. A portfolio is then created
  for it and its generation job runs on an empty transcript.
- The reason `all_covered` is stored even when most skills were never discussed, for example when the page's
  ten second safety timer fires or someone calls the endpoint by hand. The stored reason is what the
  assessor and later reports rely on, so a wrong value is a data integrity defect.

Required behaviour: only a session that is running can be ended this way, and the stored reason says what
really happened.

In scope: the `audio_complete` endpoint and the reason it records. Out of scope: how the websocket decides
to wrap up, the time ceiling path, the manual end by an assessor, and any change to the candidate page.

Assumption (no spec existed): when the candidate page ends a session whose configured skills are not all
covered, the right reason is `manual_candidate`, which already exists in the reason list and means the
candidate side ended it.

## Acceptance Criteria

- **AC-1** Given a session that was never started (status pending),
  When `audio_complete` is called with its invite token,
  Then the response is 422, the session stays pending, no portfolio is created and no job is queued.
- **AC-2** Given a running session in which every configured skill is covered,
  When `audio_complete` is called,
  Then the session is ended with reason `all_covered`, one pending portfolio exists and exactly one job is queued.
- **AC-3** Given a running session in which at least one configured skill is not covered,
  When `audio_complete` is called,
  Then the session is ended with reason `manual_candidate`, never `all_covered`, and the portfolio job is queued.
- **AC-4** Given a session that is already ended,
  When `audio_complete` is called again,
  Then the response is 200 "already ended", the stored reason is unchanged and nothing is queued.
- **AC-5** Given a token that matches no session,
  When `audio_complete` is called,
  Then the response is 404.

## Design Plan

- `SessionsController#audio_complete`: keep the lookup by token and the already-ended answer. Add a guard that
  answers 422 unless the session is active. Then choose the reason from the data: `all_covered` when
  `Coverage::MapInjector#all_covered?` is true, otherwise `manual_candidate`. The comment that justified skipping
  the check is replaced by one that explains why the reason is derived instead.
- No schema change, no change to `EndHandler`, no web change. The page already retries until it gets a success,
  and it only calls the endpoint after the session was started.
- Tests: request specs in `api/spec/requests/audio_complete_spec.rb`, each tagged `[004/AC-n]`. Coverage rows are
  created directly, so nothing calls Gemini.
- Known limits: the endpoint still needs only the invite token, by design, so anyone with the link can end a
  running session; only the label and the precondition are fixed here. If a discovered skill appears between the
  interviewer's goodbye and this call, `all_covered?` is false and the reason becomes `manual_candidate`; the
  label is honest and the portfolio is still generated.

## Definition of Done

- [ ] Each acceptance criterion has a test that fails before the fix and passes after, shown in the history.
- [ ] A3 marked fixed in the audit with a link to the tests.
- [ ] The existing suite stays green.
- [ ] The reason assumption is written in the assessment notes with an owner.
- [ ] No company, product or client name appears in the change.
