# Spec 025: An invite link opens the web app, not the API

Status: proposed

## Spec

An assessor invites a candidate by sending a link of the form `<base>/interview/<token>`. The interview page exists only in the
web app; the API has no such route. The base comes from the setting `APP_BASE_URL`, and everything that tells an operator what to
put there says the opposite of what the code needs: the API's readme calls it the "Backend base URL" with the API's own port as
the example, the sample configuration sets it to the API's port, the code's default is the API's port, and the production manifest
sets it to the API's domain (new audit finding B14).

A candidate who follows a link built from any of these values lands on the API, which answers "Route not found" (before spec 012,
the framework's HTML error page, which is what a ticket of the source project already described for this very address). The
objective of the whole product, a candidate reaching the interview, is only met when someone notices and sets the variable to the
web app's address by hand.

Required behaviour: the setting names the web app's base address; the code's default, the sample and the production manifest all
agree with that, and the documentation says so.

In scope: the default in the code, the sample, the production manifest and the readme text. Out of scope: renaming the variable
(existing deployments set it; the name stays and its meaning is now stated), and the interview page itself.

Assumption (no spec existed): the variable keeps its name; "app base url" is read as the base address of the web app that candidates
open. Deployments that already set it to the web app's address are unaffected.

## Acceptance Criteria

- **AC-1** Given no `APP_BASE_URL` in the environment,
  When a session builds its invite link,
  Then the link starts with the web app's local address, `http://localhost:5173`, and ends with `/interview/<token>`.
- **AC-2** Given `APP_BASE_URL` set,
  When a session builds its invite link,
  Then the link starts with that value.
- **AC-3** Given the sample configuration,
  When its `APP_BASE_URL` and its `ALLOWED_ORIGINS` are read,
  Then they are the same address: the one that opens the invite links is the one allowed to call the API.
- **AC-4** Given the production manifest,
  When its `APP_BASE_URL` and its `ALLOWED_ORIGINS` are read,
  Then they are the same address.

## Design Plan

- `Session#invite_url`: the default of `APP_BASE_URL` becomes `http://localhost:5173`.
- `application.yml.sample`: `APP_BASE_URL: "http://localhost:5173"` with a comment saying it is the web app's address.
- `k8s/configmap.yaml`: `APP_BASE_URL` becomes the frontend placeholder already used by `ALLOWED_ORIGINS`.
- `api/README.md`: `APP_BASE_URL` is described as the web app's base address, used to build invite links.
- Tests: `api/spec/models/session_invite_url_spec.rb`, tagged `[025/AC-n]`; the sample and the manifest are read as YAML.
- Known limits: the check ties the two settings together but cannot know that a real deployment's value is right; a deployment that
  set `APP_BASE_URL` to the API address must change it.

## Definition of Done

- [ ] AC-1, AC-3 and AC-4 fail before the fix and pass after, shown in the history; AC-2 keeps passing.
- [ ] B14 recorded in the audit as found while checking the documentation, with how it was verified, and marked fixed.
- [ ] No company, product or client name appears in the change.
