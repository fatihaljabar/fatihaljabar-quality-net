# Spec 024: The allowed web origins are explicit in production

Status: proposed

## Spec

The sample configuration allows any origin (`ALLOWED_ORIGINS: "*"`), and the CORS setup reads the variable with no check
(audit finding B11). Two things follow:

- Someone who copies the sample into a real deployment opens the API to browsers on any site. The API authenticates with a bearer
  token rather than a cookie, which limits the harm, but the point of the setting is to name the one web app that may call it.
- When the variable is missing or empty, the API stops at boot with the framework's key error, which names a method and not the
  setting. Failing fast is right; the message is not.

Required behaviour: in production the origins must be listed and must not be `*`; a missing or empty value stops the boot with a
message that names the variable and says what to put in it; the sample names the local web app, not everyone.

In scope: how the variable is read and validated, and the sample value. Out of scope: which headers and methods are allowed, and
credentials.

Assumption (no spec existed): `*` stays usable outside production, where someone testing from another host may want it; only
production refuses it.

## Acceptance Criteria

- **AC-1** Given the production environment,
  When the variable is `*` or a list that contains `*`,
  Then reading it fails with a message that names the variable.
- **AC-2** Given any environment,
  When the variable is missing, empty or only separators,
  Then reading it fails with a message that names the variable and says to list the web app origins.
- **AC-3** Given a comma separated list with spaces,
  When it is read,
  Then the result is the list of origins, trimmed, in order.
- **AC-4** Given an environment other than production,
  When the variable is `*`,
  Then it is accepted.
- **AC-5** Given the sample configuration,
  When its allowed origins are read,
  Then they name the local web app and not `*`.

## Design Plan

- `api/config/allowed_origins.rb`: a small module `AllowedOrigins.parse(value, production:)` that splits, trims, and raises
  `ArgumentError` for the two failures. It lives under `config/` and is loaded with `require_relative` by the CORS initializer, so
  the autoloader does not manage it.
- `api/config/initializers/cors.rb`: `origins AllowedOrigins.parse(ENV['ALLOWED_ORIGINS'])`.
- `api/config/application.yml.sample`: `ALLOWED_ORIGINS: "http://localhost:5173"`, the web dev server.
- Tests: `api/spec/config/allowed_origins_spec.rb`, tagged `[024/AC-n]`; the sample is read as YAML.
- Known limits: the check runs at boot, so a wrong but valid origin is not detected; it only refuses empty and `*`.

## Definition of Done

- [ ] AC-1, AC-2 and AC-5 fail before the fix and pass after, shown in the history; AC-3 and AC-4 are new behaviour of the same module and fail with it.
- [ ] B11 marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
