# frozen_string_literal: true

class FitGapReport < ApplicationRecord
  FIT_RESULTS = %w[match gap exceed not_assessed].freeze

  # Reachable only through a portfolio of the current tenant (spec 003); see Portfolio.
  default_scope { where(portfolio_id: Portfolio.select(:id)) }

  belongs_to :portfolio
  belongs_to :vacancy

  # An empty list is valid: a pending report has not produced comparisons yet. Only a missing value is not.
  validate { errors.add(:skill_comparisons, :blank) if skill_comparisons.nil? }
end
