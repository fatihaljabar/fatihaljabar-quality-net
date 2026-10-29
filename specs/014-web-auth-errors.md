# Spec 014: The web app signs a user out only when the session is no longer valid

Status: proposed

## Spec

The web app's HTTP client treats every 401 and every 403 answer the same way: it deletes the stored login token and sends
the browser to the login page (audit finding B5). That is right for a token the API no longer accepts. It is wrong in two
other cases:

- A 403 means "you are signed in but not allowed", for example a role that may not use an endpoint, or a company that
  cannot be found. Signing the user out hides the reason and can start a loop: the user logs in, opens the same page, is
  refused again, and is thrown back to the login page.
- A wrong password is answered with a 401 by the login request itself. The client reacts by reloading the login page, so the
  error message the page is about to show is lost and the user sees a form that reset for no visible reason.

Required behaviour: only a 401 on a request made with a stored session ends it; a 403 and a failed login reach the page
that asked, which already knows how to show an error.

In scope: the response handling of the HTTP client. Out of scope: wording of messages, the login page, refreshing tokens,
and what each page does with a 403.

Assumption (no spec existed): a 403 is a permission answer, never a reason to discard the token; the user keeps the session
and sees an error on the page.

## Acceptance Criteria

- **AC-1** Given a signed-in user with a stored token,
  When a request is answered with 403,
  Then the token stays, the browser is not redirected, and the error reaches the caller.
- **AC-2** Given a signed-in user with a stored token,
  When a request is answered with 401,
  Then the token is deleted and the browser is sent to the login page.
- **AC-3** Given the login request itself,
  When it is answered with 401,
  Then the browser is not redirected and the error reaches the caller, so the page can show it.

## Design Plan

- `web/src/services/api.ts`: the response error handler ends the session only for a 401 whose request was not the login
  request. Everything else is passed on unchanged.
- `web/src/services/api.test.ts`: tests on the real client with a stand-in network layer and a stand-in for the browser's
  location, tagged `[014/AC-n]`.
- Known limits: pages that did not expect a 403 may show a raw error until each page is reviewed; that belongs to the
  per-page error handling of finding B1 (web half).

## Definition of Done

- [ ] AC-1 and AC-3 fail before the fix and pass after, shown in the history; AC-2 keeps passing.
- [ ] B5 marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
