# frozen_string_literal: true

require 'rails_helper'

# Spec 021 (021/AC-1, AC-2): the portfolio read lists the configured skills that have no stored result.
RSpec.describe 'Portfolio read: skills that were not assessed', type: :request do
  let(:tenant) { create_tenant }
  let(:interview) { create_interview_session(tenant, status: 'ended') }
  let(:portfolio) { create_portfolio(interview) } # stores the configured skill 'Skill'

  def add_configured_skill(label, order)
    interview.assessment.assessment_skills.create!(
      skill_label: label, display_order: order,
      l1_anchor: 'l1', l2_anchor: 'l2', l3_anchor: 'l3', l4_anchor: 'l4', l5_anchor: 'l5'
    )
  end

  def read
    get "/api/v1/sessions/#{interview.id}/portfolio", headers: auth_headers(tenant)
    JSON.parse(response.body).fetch('portfolio')
  end

  it '[021/AC-1] lists the configured skill that has no stored result, and not the stored one' do
    portfolio
    add_configured_skill('Other', 2)

    body = read

    expect(body['not_assessed_skills']).to eq([{ 'skill_id' => nil, 'skill_label' => 'Other' }])
  end

  it '[021/AC-2] lists nothing when every configured skill is stored, or when a discovered skill is added' do
    portfolio.portfolio_skills.create!(skill_label: 'Found', is_discovered: true, ai_level: 2, ai_confidence: 'low',
                                       evidence: [], competency_summary: 'summary')

    expect(read['not_assessed_skills']).to eq([])
  end
end
