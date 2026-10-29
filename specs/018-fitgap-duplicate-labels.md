# Spec 018: The fit/gap report compares every skill a vacancy asks for

Status: proposed

## Spec

A vacancy lists the skills it requires, each with an expected level. The fit/gap engine builds its comparison from a lookup
keyed by the skill label (audit finding B9). If two of a vacancy's skills have the same label, the second silently replaces
the first: one requirement disappears from the report, and the comparison, the narrative and the exported PDF all describe
a vacancy that asks for less than it does. Nothing says that a requirement was dropped. A recruiter reads "no gaps" for a
role whose second requirement was never compared.

Required behaviour: the report holds one comparison for every skill row of the vacancy, in the order the rows were saved,
whether or not labels repeat.

In scope: how the engine walks the vacancy's skills. Out of scope: refusing duplicate labels when a vacancy is saved (a
product decision: duplicates may be a mistake or two different levels of one skill), and how the web page lays out two rows with
the same label.

Assumption (no spec existed for duplicates): a duplicate is reported, not merged and not refused; the assessor sees both
rows and can correct the vacancy.

## Acceptance Criteria

- **AC-1** Given a vacancy with two skills that share a label and have different expected levels,
  When the fit/gap report is built,
  Then it holds two comparisons for that label, one per expected level, each compared with the candidate's level.
- **AC-2** Given a vacancy whose skills all have different labels,
  When the report is built,
  Then it holds one comparison per skill, in the order the rows were saved, as before.

## Design Plan

- `FitGap::Engine#build_skill_comparisons`: walk the vacancy's skill rows ordered by id instead of building a lookup by
  label first. The matching of a row to a portfolio skill and the result rules are unchanged.
- Tests: `api/spec/services/fit_gap_duplicate_labels_spec.rb`, tagged `[018/AC-n]`, with a fake language model client.
- Known limits: two rows with the same label are compared with the same portfolio skill; the narrative lists both.

## Definition of Done

- [ ] AC-1 fails before the fix and passes after, shown in the history; AC-2 keeps passing.
- [ ] B9 marked fixed in the audit with a link to the checks.
- [ ] No company, product or client name appears in the change.
