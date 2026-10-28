# frozen_string_literal: true

class FitGapReport < ApplicationRecord
  FIT_RESULTS = %w[match gap exceed not_assessed].freeze

  # Reachable only through a portfolio of the current tenant (spec 003); see Portfolio.
  default_scope { where(portfolio_id: Portfolio.select(:id)) }

  belongs_to :portfolio
  belongs_to :vacancy

  IN_FLIGHT = %w[pending generating].freeze

  # An empty list is valid: a pending report has not produced comparisons yet. Only a missing value is not.
  validate { errors.add(:skill_comparisons, :blank) if skill_comparisons.nil? }

  def in_flight? = IN_FLIGHT.include?(generation_status)
  def complete?  = generation_status == 'complete'

  # The only place that asks for a (re)build (spec 007). A report is never deleted: it is marked pending and replaced
  # when the job succeeds. If a rebuild is already waiting or running, nothing is queued, so a page that asks every
  # few seconds, or an assessor who saves two overrides, cannot pile up jobs. Returns the report.
  def self.request!(portfolio:, vacancy:)
    report, queue = transaction do
      current = lock.find_by(portfolio_id: portfolio.id, vacancy_id: vacancy.id)
      next [current, false] if current&.in_flight?

      if current
        current.update!(generation_status: 'pending', generation_error: nil)
        [current, true]
      else
        [create!(portfolio: portfolio, vacancy: vacancy, generation_status: 'pending'), true]
      end
    end

    FitGapGeneratorWorker.perform_async(portfolio.id, vacancy.id) if queue
    report
  rescue ActiveRecord::RecordNotUnique
    find_by!(portfolio_id: portfolio.id, vacancy_id: vacancy.id) # two requests created it at once; the other one queued
  end
end
