# Spec 022: An unknown tenant is refused, never served as the default organization

Status: proposed

## Spec

Every request is tied to a tenant (a company) by the tenant resolver. When the request names a tenant the system does not
know, or names none at all, the lookup falls back to a reserved "default" organization with id 0 instead of failing (audit
finding A9). If that organization exists, as it does in the platform this code was taken from, the request then counts as having
a tenant, the "tenant required" check passes, and the request is served as if it belonged to the default organization. The
mistake of a client (a wrong header, a missing one, a typo in a scheme) is no longer reported, and any code that relies on
"a tenant was identified" is told so about a tenant nobody chose.

The audit rated this P2 because it could not be reproduced where the audit ran (the default organization did not exist there);
it is real wherever that organization exists. It is the same class as A1 and A2: a trust boundary that opens when it should
close.

Required behaviour: a tenant is identified only by a match; an unknown or missing tenant is answered 403 "Tenant not found",
default organization or not.

In scope: how an organization is looked up from the identifier of a request. Out of scope: the candidate links, which carry
their own token, the websocket endpoints, and background jobs, which run with no tenant on purpose (spec 003).

Assumption (no spec existed): nothing relies on the default organization being returned for an unknown identifier; the only
caller that compares the result (login) already treats a different organization as a mismatch.

## Acceptance Criteria

- **AC-1** Given a default organization with id 0,
  When a request carries a tenant scheme that matches no organization,
  Then it is answered 403 "Tenant not found" before any authentication.
- **AC-2** Given a default organization with id 0,
  When a request carries no tenant information at all,
  Then it is answered 403 "Tenant not found".
- **AC-3** Given a known tenant,
  When a request carries its scheme,
  Then the tenant is identified and the request goes on to authentication.
- **AC-4** Given a default organization with id 0,
  When someone logs in with a scheme that matches no organization,
  Then the answer is 401 with the same message as a wrong password.

## Design Plan

- `Organization.identify`: return the matching organization or nothing; remove the fallback to the default organization, for a
  blank identifier too. `default_organization` stays as a plain finder for whoever needs it explicitly.
- No change to the middleware or the controllers: with no organization resolved, the existing "tenant required" check answers 403.
- Tests: `api/spec/requests/tenant_resolution_spec.rb`, tagged `[022/AC-n]`, which creates the default organization first.
- Known limits: the default scope of the tenant models still opens when no tenant is in context, which jobs need (audit finding
  A9, the other half); the resolver still reads the scheme of a token without verifying it, and relies on the authentication that
  follows to refuse a forged one.

## Definition of Done

- [ ] AC-1 fails before the fix and passes after, shown in the history; AC-2 to AC-4 keep passing (a request with no tenant information at all
      was already refused, because the resolver gives up before the lookup; they guard it).
- [ ] A9 marked fixed for the fallback in the audit, with the remaining limits written down.
- [ ] No company, product or client name appears in the change.
