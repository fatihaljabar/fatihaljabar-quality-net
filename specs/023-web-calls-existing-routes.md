# Spec 023: The web app only calls routes the API has

Status: proposed

## Spec

The web app has a signup page that sends `POST /signup`. The API has no such route, and the page is not reachable from the web
app's router either; it also offers a choice of role, including "Admin" (audit finding B10). It is dead code that looks like a
feature: anyone reading the source would believe the product can create accounts, and anyone who wired the page into the
router would ship a button that always fails. Behind it is a class of defect: the web app's requests are written by hand and
nothing checks them against the API's routes, which is also how the empty fit/gap column (A7) got through.

Required behaviour: every request that the web app's services make is answered by a route the API has, checked on every
pull request, and the dead signup page and its request are removed.

In scope: a check of the paths and methods the web services call against the API's routes, and the removal of the signup page and
its service function. Out of scope: building a signup feature (roles and account creation have no spec; this is finding MS-1,
accepted), the shape of requests and responses (spec 010 covers the fit/gap read), and paths built outside the services.

Assumption (no spec existed): there is no signup in this product until someone defines it; removing the dead page loses no
behaviour, because it could not work.

## Acceptance Criteria

- **AC-1** Given the web app's service files,
  When the requests they make are collected,
  Then the check finds them, across the main services, so it cannot pass on an empty list.
- **AC-2** Given the requests collected from the service files,
  When each is matched to the API's routes with its method,
  Then every one has a route, and a path that only the catch-all route of spec 012 would answer does not count.

## Design Plan

- `api/spec/contracts/web_routes_spec.rb`: reads `web/src/services/*.ts`, extracts each `api.get|post|put|patch|delete` call with
  a path, turns `${...}` into a number and drops the query, and asks the API's router to recognise it under `/api/v1`. It runs in
  `API tests`, which already checks out the whole repository.
- Web: delete `pages/auth/SignupPage.tsx` and `signup` in `services/auth.ts`.
- Known limits: only paths written as string or template literals in the services are seen; a path built from variables, or a call
  made outside the services, is not. The check proves a route exists, not that the answer has the shape the page reads.

## Definition of Done

- [ ] AC-2 fails before the removal and passes after, shown in the history; AC-1 keeps passing.
- [ ] B10 marked fixed in the audit, with the signup feature itself left to MS-1.
- [ ] No company, product or client name appears in the change.
