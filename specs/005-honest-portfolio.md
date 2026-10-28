# Spec 005: A portfolio only states what the interview supports

Status: proposed

## Spec

After an interview the portfolio generator asks a language model for a level and a confidence per skill and
stores the answer as given (audit finding A4). Two things go wrong:

- A skill the interviewer never reached can still be stored. When the model returns no level, the code turns
  it into level 1. The fit/gap report then compares that invented L1 with the vacancy and reports a "Gap" for a
  candidate nobody examined.
- The confidence comes straight from the model. The product definition says it must follow the coverage data:
  high when the skill is covered and was probed at least three times; medium when it was probed twice or is
  partial; low when it was probed once or less, or only initiated. The prompt states the rule, but nothing in the
  code enforces it, so a thin interview can be shown as "high confidence".

Both feed hiring decisions, so a wrong stored value is a data integrity defect, not a display issue.

Required behaviour: a level is stored only for a skill the interview reached and for which the model gave a valid
level; the confidence is computed from the coverage data; the model cannot add skills the coverage map does not know.

In scope: how the portfolio generator stores skills and how confidence is computed. Out of scope: the
quality of the model's rating itself, how coverage states are advanced (audit finding A5), the portfolio page
and any other web change, and fit/gap, which already reports a missing skill as not assessed.

Assumptions (no spec existed, to be confirmed by product):
1. A skill that was not assessed is represented by the absence of a portfolio skill, because the database
   requires a level. Fit/gap already turns that into `not_assessed`.
2. Where the example in the end-to-end simulation contradicts the confidence rule of the behaviour document
   (Communication, covered after four probes, shown as medium), the rule governs.

## Acceptance Criteria

- **AC-1** Given a configured skill whose coverage state is `not_yet`,
  When the model returns a level for it,
  Then no portfolio skill is stored for it and the portfolio still completes.
- **AC-2** Given a skill the interview reached,
  When the model returns no level, or a level outside 1 to 5, or text that is not a level,
  Then no portfolio skill is stored for it, and in particular it is not stored as level 1.
- **AC-3** Given skills with the coverage states covered after three probes, covered after two probes,
  partial after four probes and initiated after one probe,
  When the portfolio is generated,
  Then the stored confidence is high, medium, medium and low, whatever confidence the model returned.
- **AC-4** Given a discovered skill that the model returns,
  When the coverage map has no discovered skill with that label,
  Then it is not stored; when it does, it is stored with the confidence computed from its coverage row.
- **AC-5** Given a vacancy that requires a skill with no portfolio skill,
  When the fit/gap report is built,
  Then that skill is `not_assessed` and not a gap.
- **AC-6** Given a skill the interview reached and a valid level from the model, a number from 1 to 5 or the
  same with an `L` prefix,
  When the portfolio is generated,
  Then the level is stored as that number and at most three evidence quotes are kept.

## Design Plan

- `Coverage::StateEngine.confidence(state:, probe_count:)`: the single place where the rule lives, next to the
  other coverage rules. Order: low first (probe count of one or less, or state initiated), then high (covered with
  three or more probes), otherwise medium.
- `Portfolios::Generator#save_skills`: for each skill the model returns, find its coverage row (configured: by skill id,
  else by label ignoring case; discovered: by label among discovered rows). Store only when the row exists, its state
  is not `not_yet`, and the level parses to an integer from 1 to 5 (an `L` prefix is accepted). Confidence always
  comes from `StateEngine.confidence`; the model's value is ignored.
- No schema change, no controller change, no web change.
- Tests: `api/spec/services/portfolio_generator_spec.rb` with a fake language model client passed to the
  generator, and a fit/gap case with the same style of fake. Tagged `[005/AC-n]`. Nothing calls the network.
- Known limits: the rating itself is still the model's judgment; this spec only stops it from being stored without
  support. The coverage states are themselves produced by a model and one rule that advances them without
  evidence is a separate finding (A5). The portfolio page lists stored skills only, so a configured skill that was
  not assessed is simply absent there; showing it as "not assessed" needs a web change and a decision on the
  wording, left as a follow-up.

## Definition of Done

- [ ] Each acceptance criterion has a test that fails before the fix and passes after, shown in the history.
- [ ] A4 marked fixed in the audit with a link to the tests, and the display follow-up listed as remaining.
- [ ] The existing suite stays green.
- [ ] The two assumptions are written in the assessment notes with an owner.
- [ ] No company, product or client name appears in the change.
