# frozen_string_literal: true

require 'rails_helper'

# Spec 003 (003/AC-6): background jobs run with no tenant in the request context and must keep working.
RSpec.describe FitGapGeneratorWorker do
  it '[003/AC-6] loads the portfolio and builds the report without a tenant in context' do
    tenant = create_tenant
    portfolio = create_portfolio(create_interview_session(tenant, status: 'ended'))
    vacancy = create_vacancy(tenant)
    RequestStore.clear!
    allow_any_instance_of(Gemini::HttpClient).to receive(:generate_content)
      .and_return({ 'culture_narrative' => 'culture', 'overall_narrative' => 'overall' })

    described_class.new.perform(portfolio.id, vacancy.id)

    report = FitGapReport.find_by(portfolio_id: portfolio.id, vacancy_id: vacancy.id)
    expect(report).not_to be_nil
    expect(report.skill_comparisons.first).to include('result' => 'match', 'candidate_level' => 3)
  end
end
