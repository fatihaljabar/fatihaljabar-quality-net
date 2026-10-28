# frozen_string_literal: true

require 'rails_helper'

# Spec 005 (005/AC-5): a required skill with no portfolio skill is not assessed, never a gap.
RSpec.describe FitGap::Engine do
  it '[005/AC-5] reports not_assessed for a required skill the portfolio does not contain' do
    tenant = create_tenant
    portfolio = create_interview_session(tenant, status: 'ended').create_portfolio!(generation_status: 'complete')
    vacancy = create_vacancy(tenant)
    client = instance_double(Gemini::HttpClient,
                             generate_content: { 'culture_narrative' => 'c', 'overall_narrative' => 'o' })

    report = described_class.new(portfolio: portfolio, vacancy: vacancy, gemini_client: client).call

    comparison = report.skill_comparisons.first
    expect(comparison).to include('skill_label' => 'Skill', 'result' => 'not_assessed')
    expect(comparison['candidate_level']).to be_nil
  end
end
