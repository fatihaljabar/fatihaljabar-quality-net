# frozen_string_literal: true

class FitGapReport < ApplicationRecord
  FIT_RESULTS = %w[match gap exceed not_assessed].freeze

  # Reachable only through a portfolio of the current tenant (spec 003); see Portfolio.
  default_scope { where(portfolio_id: Portfolio.select(:id)) }

  belongs_to :portfolio
  belongs_to :vacancy

  validates :skill_comparisons, presence: true
end
