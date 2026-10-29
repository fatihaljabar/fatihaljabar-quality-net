# Spec 009: The web app installs the same way every time

Status: proposed

## Spec

The web app declares its dependencies with floating ranges (`^1.2.3`) and has no lockfile (audit finding PR-2). Two
installs on different days can therefore produce different code, so a build that passed yesterday can fail or behave
differently today, and nobody can say which versions a release contained. A floating range is also the way a
compromised new release of a package reaches a build without any change to this repository.

Required behaviour: the exact versions of every package, with the address they come from and a hash of their content,
are committed in a lockfile; the lockfile agrees with `package.json`; every package comes from the public registry; and
the pipeline installs from the lockfile only, so an install that would change it fails instead of drifting.

In scope: the lockfile, two checks on it, and a pipeline job that installs from it and builds the app. Out of scope:
updating the versions themselves, the web test harness (PR-1b) and the build check for the development token (A8),
which are separate findings with their own specs.

Assumption (no spec existed): the versions the lockfile pins are the ones resolved at the time of the audit. Install
scripts of packages are not run in the pipeline; the build does not need them, which the build job proves.

## Acceptance Criteria

- **AC-1** Given the web app,
  When its dependencies are compared with its lockfile,
  Then the lockfile exists and records exactly the dependencies and ranges that `package.json` declares.
- **AC-2** Given the lockfile,
  When every locked package is inspected,
  Then each one is resolved from the public registry over https and carries an integrity hash.
- **AC-3** Given a pull request,
  When the pipeline runs,
  Then a job named `Web build` installs with `npm ci` and builds the app, and fails if the lockfile and `package.json`
  disagree. Verified by: the `Web build` job on any pull request, not by a unit test.

## Design Plan

- `web/package-lock.json`: generated with `npm install --ignore-scripts` and committed, lockfile version 3.
- `tools/web-lockfile.test.js`: two tests on `node:test`, tagged `[009/AC-1]` and `[009/AC-2]`. They read
  `web/package.json` and the lockfile and need no install. They run in the existing `Gate tests` job.
- `.github/workflows/web.yml`: job `Web build` with `npm ci --ignore-scripts` then `npm run build` (type check and
  bundle). No path filter, so it can become a required check. Actions pinned by commit SHA, read-only permissions.
- Known limits: a lockfile proves which bytes were chosen, not that they are safe or good. The registry itself is
  trusted. Dependencies are not updated by this change, and no automatic update process exists yet.

## Definition of Done

- [ ] AC-1 and AC-2 fail before the lockfile is committed and pass after, shown in the history.
- [ ] The `Web build` job fails before the lockfile is committed (nothing to install from) and passes after.
- [ ] PR-2 marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
