# Spec 011: A development login token never reaches a production build

Status: proposed

## Spec

The web app takes its login token from the browser's storage and, when there is none, from a build-time variable meant
for local development (audit finding A8). The README lists that variable as required. Build-time variables are copied
into the public JavaScript files, and the app treats any token as a signed-in user. A production build made with the
variable set therefore contains a working token that anyone can read, and every visitor passes the login gate without
signing in.

Required behaviour: the development token is used only when the app runs in development mode. A production build never
contains it, whatever the environment of the machine that builds it, and a token the user obtained by signing in always
wins.

In scope: the place that reads the token, a check on the built files, and the README line that calls the variable
required. Out of scope: other variables that end up in the bundle on purpose (the API address, the development tenant
name), how tokens are stored in the browser (local storage), and the login page itself.

Assumption (no spec existed): the developer experience stays as it is, a token in the environment still signs a developer
in during `npm run dev`; only production builds change.

## Acceptance Criteria

- **AC-1** Given a production build made with a development token in its environment,
  When the built files are searched for that token,
  Then it appears in none of them.
- **AC-2** Given development mode, no stored token and a development token in the environment,
  When the app asks for the token,
  Then it gets the development token.
- **AC-3** Given production mode, no stored token and a development token in the environment,
  When the app asks for the token,
  Then it gets none.
- **AC-4** Given a stored token and a development token in the environment, in either mode,
  When the app asks for the token,
  Then it gets the stored token.

## Design Plan

- `getStoredToken` in `web/src/stores/authAtom.ts`: the fallback reads the environment variable only when
  `import.meta.env.DEV` is true (AC-3).
- `web/vite.config.ts`: for a build, `import.meta.env.VITE_DEV_TOKEN` is defined as undefined. This is needed on top of
  the first point: the first design assumed the bundler would drop the unused value, and the build test (AC-1) stayed red
  after the source change. A dependency reads the whole `import.meta.env` object, so the bundler copies every `VITE_`
  variable into a vendor file whatever the app's own code does. Defining the one name removes it from that copy too.
- `web/src/stores/authAtom.test.ts`: AC-2 to AC-4 with stubbed environment and storage.
- `web/src/build/bundle-token.test.ts`: runs the real `vite build` into a temporary folder with a marker token in the
  environment and searches every output file for the marker (AC-1). It is slow for a unit test (a few seconds) and runs
  in the `Web build` job like the others.
- Not covered by a test: that `npm run dev` still receives the token. The definition applies to builds only; AC-2 covers the
  app's side of it.
- README: the variable is described as optional and development only.
- Known limits: other secrets someone puts in a `VITE_` variable would still be published (the whole set is copied, see
  above), so no secret belongs in one; the check covers this one name
  only, which is the one the code reads. A token kept in local storage is readable by scripts of the page (not changed here).

## Definition of Done

- [ ] AC-1 and AC-3 fail before the fix and pass after, shown in the history; AC-2 and AC-4 keep passing.
- [ ] A8 marked fixed in the audit with a link to the checks.
- [ ] The existing suites stay green.
- [ ] No company, product or client name appears in the change.
