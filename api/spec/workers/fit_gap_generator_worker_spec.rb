# frozen_string_literal: true

require 'rails_helper'

# Spec 007 (007/AC-3, AC-4): the job settles the report as complete or failed.
RSpec.describe FitGapGeneratorWorker do
  let(:tenant) { create_tenant }
  let(:portfolio) { create_portfolio(create_interview_session(tenant, status: 'ended'), level: 5) }
  let(:vacancy) { create_vacancy(tenant) }

  it '[007/AC-3] stores the new comparisons, marks the report complete and clears the error' do
    report = create_report(portfolio, vacancy, status: 'generating', error: 'earlier failure')
    expect_any_instance_of(Gemini::HttpClient).to receive(:generate_content)
      .and_return({ 'culture_narrative' => 'c', 'overall_narrative' => 'o' })

    described_class.new.perform(portfolio.id, vacancy.id)

    report.reload
    expect(report.generation_status).to eq('complete')
    expect(report.generation_error).to be_nil
    expect(report.skill_comparisons.first).to include('candidate_level' => 5, 'result' => 'exceed')
  end

  it '[007/AC-4] marks the report failed with the error and keeps its comparisons when retries are exhausted' do
    report = create_report(portfolio, vacancy, status: 'generating')
    handler = described_class.sidekiq_retries_exhausted_block
    expect(handler).not_to be_nil, 'the job has no handler for exhausted retries'

    handler.call({ 'args' => [portfolio.id, vacancy.id], 'error_message' => 'model unavailable', 'retry_count' => 2 },
                 StandardError.new('model unavailable'))

    report.reload
    expect(report.generation_status).to eq('failed')
    expect(report.generation_error).to include('model unavailable')
    expect(report.skill_comparisons).to eq(TenantHelpers::COMPARISONS)
  end
end
