# Spec 012: Unknown routes answer with JSON

Status: proposed

## Spec

Two closed tickets in the source project (#1 and its duplicate #3) asked for this, and both were closed without a fix
or a test (audit finding B1). A request to a path the API does not know is answered with the framework's HTML error
page, or in tests with an exception, instead of a JSON error. Every client of this API reads JSON, so an HTML page is
noise for the web app and hides the real problem from whoever calls a wrong URL.

The same change was written once before, quickly, without a spec or a test: pull request #3, which the
definition-of-ready gate blocked and which stays open as the demonstration of that. This spec is the same change done
with its inputs.

Required behaviour: any path no route matches, with any method, is answered 404 with a JSON body, and known routes are
not affected.

In scope: the routing of unknown paths. Out of scope: the web pages that show an empty form for a record that does not
exist (the other half of B1, tickets #2 and #4), and the error format of known endpoints.

Assumption (the ticket gives an example body, `{"error": ..., "status": 404}`): the body uses the API's existing error
shape, `{"errors": [{"status": 404, "message": "Route not found"}]}`, so a client reads one format everywhere. The ticket's
criteria, a JSON 404 with a message and a status code and never an HTML page, are met either way.

## Acceptance Criteria

- **AC-1** Given a path that no route matches, inside or outside `/api/v1`, with GET, POST or DELETE,
  When it is requested without a token,
  Then the response is 404 with a JSON body holding the status and the message "Route not found", and no HTML.
- **AC-2** Given the root path `/`,
  When it is requested,
  Then the response is the same JSON 404.
- **AC-3** Given known routes, the health check, a protected endpoint without a token and an existing endpoint,
  When they are requested,
  Then they answer as before: 200 for health, 401 without a token, and the existing endpoint is reached.

## Design Plan

- `api/config/routes.rb`: two last routes, `/` and `*unmatched` with `format: false` and `via: :all`, to
  `RoutingErrorsController#not_found`.
- `api/app/controllers/routing_errors_controller.rb`: inherits `ActionController::API` directly, not the application
  controller, so it needs no tenant and no token; it renders `json_error('Route not found', :not_found)`.
- Tests: `api/spec/requests/unknown_routes_spec.rb`, tagged `[012/AC-n]`.
- Known limits: paths handled by the websocket middleware never reach the router and are not affected. A JSON 404 tells
  a caller the path is wrong; it does not hide that the API exists.

## Definition of Done

- [ ] AC-1 and AC-2 fail before the fix and pass after, shown in the history; AC-3 keeps passing.
- [ ] B1 in the audit says which half is fixed and which remains.
- [ ] Pull request #3 stays open and unmerged.
- [ ] No company, product or client name appears in the change.
