# frozen_string_literal: true

# Gives a fit/gap report a status and an error (spec 007, audit finding A6). Existing rows are complete reports, so
# they default to complete. skill_comparisons gets an empty-list default so a pending row can exist before its first
# generation.
class AddGenerationStatusToFitGapReports < ActiveRecord::Migration[7.0]
  def change
    add_column :fit_gap_reports, :generation_status, :enum, enum_type: :generation_status, default: 'complete', null: false
    add_column :fit_gap_reports, :generation_error, :text
    change_column_default :fit_gap_reports, :skill_comparisons, from: nil, to: []
  end
end
