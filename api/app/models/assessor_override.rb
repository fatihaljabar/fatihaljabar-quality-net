# frozen_string_literal: true

class AssessorOverride < ApplicationRecord
  # Reachable only through a portfolio skill of the current tenant (spec 003); see Portfolio.
  default_scope { where(portfolio_skill_id: PortfolioSkill.select(:id)) }

  belongs_to :portfolio_skill

  validates :ai_level,       numericality: { only_integer: true, in: 1..5 }
  validates :override_level, numericality: { only_integer: true, in: 1..5 }
  validates :overridden_by,  presence: true
end
