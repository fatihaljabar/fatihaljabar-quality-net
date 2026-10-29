# Spec 019: Regenerating a portfolio never loses what an assessor decided

Status: proposed

## Spec

The portfolio generator rebuilds a portfolio by deleting every skill row and then creating them again from the model's
answer (audit finding B3). Two things follow:

- A skill's human override hangs off the skill row, so deleting the row deletes the override. An assessor's decision about a
  candidate's level disappears the moment the portfolio is generated again, which also happens when a failed job is retried.
- The delete and the creation are separate steps with no transaction around them. If the second step fails halfway, the old
  skills are already gone and only some of the new ones exist: a half portfolio, with its overrides, replaces a complete
  one.

Both are data integrity defects, but reachable only when a portfolio is generated more than once, which is why this was
filed as a latent finding. The fit/gap fixes of spec 007 made the first regeneration harder to avoid in practice.

Required behaviour: regeneration is all or nothing, and a skill that is still in the model's answer keeps its row and its
override, with the new model level and evidence.

In scope: how the generator stores skills when a portfolio already has some. Out of scope: how the model rates, who may
regenerate and when, and the portfolio page.

Assumption (no spec existed): a skill the new answer no longer contains is removed together with its override, because the
override belongs to a skill the portfolio no longer states. This is written down as a known limit, not hidden.

## Acceptance Criteria

- **AC-1** Given a portfolio with a skill that has an assessor override,
  When the portfolio is generated again and the model returns that skill,
  Then the skill keeps its row and its override, and holds the new level and evidence from the model.
- **AC-2** Given a portfolio with skills and overrides,
  When a regeneration fails after it has started storing skills,
  Then the previous skills and overrides are all still there, unchanged.
- **AC-3** Given a portfolio with a skill the new answer does not contain,
  When the portfolio is generated again,
  Then that skill is no longer in the portfolio.
- **AC-4** Given a portfolio with one skill and an answer that adds another,
  When the portfolio is generated again,
  Then both skills are in the portfolio.

## Design Plan

- `Portfolios::Generator#save_skills`: do the whole replacement in one transaction. For each stored skill, update the existing
  row with the same label and kind (configured or discovered) or create one; then remove the rows of this portfolio that the
  answer did not claim. A row is claimed once, so a repeated skill in the answer still produces two rows.
- Tests: `api/spec/services/portfolio_regeneration_spec.rb`, tagged `[019/AC-n]`, with a fake language model client; the failure
  of AC-2 is produced by making the confidence rule raise on its second call.
- Known limits: an override on a skill that the new answer drops is removed with it; two skills with the same label and
  kind are matched in the order they were stored.

## Definition of Done

- [ ] AC-1 and AC-2 fail before the fix and pass after, shown in the history; AC-3 and AC-4 keep passing.
- [ ] B3 marked fixed in the audit with a link to the checks, and the dropped-skill limit written down.
- [ ] No company, product or client name appears in the change.
