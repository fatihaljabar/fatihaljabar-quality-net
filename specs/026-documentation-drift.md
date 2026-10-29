# Spec 026: The documentation matches the code it describes

Status: proposed

## Spec

Several instructions and comments in the repository describe something that is not there (audit finding B13, with one more found
while writing its check). Each one is small,
and each one costs a newcomer an hour or a wrong guess:

- the web app's sample environment file points at port 3000, while the API documents and uses port 3001, so a copied sample
  makes every request miss the API;
- the web readme says the backend runs on port 3000 by default;
- the API readme tells the reader to `cd ../ai-interview-web`, a folder that is called `web` here, twice;
- the API readme names a model variable `GEMINI_ANALYSIS_MODEL` that no code reads (the sample and the code use
  `GEMINI_FLASH_MODEL`);
- the web readme says the build tool is Vite 5, while the project uses Vite 6;
- a comment in the sessions controller says `POST /api/v1/sessions/:id/end`, while the route is `end_session`;
- a comment in the portfolio skills controller says `portfolio-skills`, while the route is `portfolio_skills` (found by the check
  for AC-5, not by the audit).

Nothing here changes behaviour, but the documentation is what a new engineer runs first, and a wrong instruction is a defect of the
setup. These drift because nothing compares text with the code.

Required behaviour: the instructions above are corrected, and checks keep the same classes of drift from coming back: variables
named in the readme exist in the sample, the ports and folders the readmes name are the real ones, the build tool version
matches, and every route a controller comment names has a route.

In scope: the six items and one check per class. Out of scope: reviewing all documentation, and the other settings the readme
lists.

Assumption (no spec existed): the API's documented port, 3001, is the right one and the web files follow it.

## Acceptance Criteria

- **AC-1** Given the API readme and the sample configuration,
  When the Gemini model variables named in one are compared with the other,
  Then each one named in the readme is in the sample, and each one in the sample is named in the readme.
- **AC-2** Given the port the API readme documents,
  When the web sample environment file and the web readme are read,
  Then the API address and the websocket address in the sample, and the default backend address in the readme, use that port.
- **AC-3** Given the folders the API readme tells the reader to enter,
  When they are looked up in the repository,
  Then each of them exists.
- **AC-4** Given the version of the build tool in the web project,
  When the web readme names its tech stack,
  Then it names the same major version.
- **AC-5** Given a comment in a controller that names a route, with its verb and path,
  When the path is looked up in the API's routes,
  Then the route exists.

## Design Plan

- `tools/docs-consistency.test.js`: Node tests, no install, for AC-1 to AC-4, reading the readmes, the sample, the web sample
  environment file and `web/package.json`.
- `api/spec/contracts/route_comments_spec.rb`: reads the controllers for comments of the form `# VERB /api/v1/path` and asks the
  router to recognise each, ignoring the catch-all route of spec 012 (AC-5).
- Fixes: the web sample and readme use port 3001; the API readme says `web` and `GEMINI_FLASH_MODEL`; the web readme says Vite 6;
  the two controller comments name the real routes.
- Known limits: the checks cover the classes listed; they do not read prose, so a sentence that is wrong in another way is not caught.

## Definition of Done

- [ ] AC-1 to AC-5 fail before the fixes and pass after, shown in the history.
- [ ] B13 marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
