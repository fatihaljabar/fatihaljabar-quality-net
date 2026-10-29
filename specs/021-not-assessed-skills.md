# Spec 021: The portfolio says which configured skills were not assessed

Status: proposed

## Spec

A portfolio stores a skill only when the interview reached it (spec 005). A skill the assessment asked for, but that the
interview never reached, is therefore absent from the portfolio, and the portfolio page lists only what is stored (audit
finding A4-UI). An assessor reading it cannot tell a skill that was not assessed from a skill that was never configured: both
are simply missing. The fit/gap report already says "not assessed" for such a skill, so the two pages disagree about whether
the skill existed.

Required behaviour: the portfolio read says which configured skills have no stored result, and the portfolio page shows them
in a section of their own, with a sentence saying that no level is stated for them.

In scope: a list of the not assessed configured skills in the portfolio read, and its display on the portfolio page. Out of
scope: how a level is rated, discovered skills (they exist only when the interview found them), the PDF export, and the wording
design.

Assumption (spec 005 left this to a later page version): "not assessed" is shown as a list of names with one explanatory
sentence, in the order the assessment configured them; no level and no confidence are invented for them.

## Acceptance Criteria

- **AC-1** Given an assessment with two configured skills and a portfolio that stores only one of them,
  When the portfolio is read,
  Then the read lists the other skill as not assessed, with its label, and not the stored one.
- **AC-2** Given a portfolio that stores every configured skill, and one that also stores a discovered skill,
  When the portfolio is read,
  Then the not assessed list is empty.
- **AC-3** Given a portfolio read with not assessed skills,
  When the portfolio page shows it,
  Then it shows a section naming those skills and saying that no level is stated for them.
- **AC-4** Given a portfolio read with none,
  When the portfolio page shows it,
  Then it shows no such section.

## Design Plan

- API: `portfolio_json` adds `not_assessed_skills`, the assessment's configured skills in display order whose label (ignoring
  case) or skill id matches no stored, non discovered portfolio skill; each entry carries `skill_id` and `skill_label`.
  The field is additive, so the export and the existing readers are unaffected.
- Web: the `Portfolio` type gets the optional field; `PortfolioPage` shows a "Not assessed" section after the configured skills
  when the list is not empty.
- Tests: an API request spec `portfolio_not_assessed_spec.rb` tagged `[021/AC-1]` and `[021/AC-2]`, and a page test
  `PortfolioNotAssessed.test.tsx` tagged `[021/AC-3]` and `[021/AC-4]`.
- Known limits: the list is computed at read time from the assessment as it is now; an assessment edited after the interview
  changes it (finding B4, still open).

## Definition of Done

- [ ] AC-1 to AC-3 fail before the fix and pass after, shown in the history (AC-2 fails because the field does not exist yet); AC-4 keeps passing.
- [ ] A4-UI marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
