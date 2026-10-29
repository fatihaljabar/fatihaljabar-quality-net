# frozen_string_literal: true

require 'rails_helper'

# Spec 018 (018/AC-1, AC-2): the report compares every skill row of the vacancy, even when labels repeat.
RSpec.describe FitGap::Engine do
  let(:tenant) { create_tenant }
  let(:portfolio) { create_portfolio(create_interview_session(tenant, status: 'ended'), level: 4) }
  let(:client) do
    instance_double(Gemini::HttpClient, generate_content: { 'culture_narrative' => 'c', 'overall_narrative' => 'o' })
  end

  def vacancy_with(*rows)
    Vacancy.create!(tenant_id: tenant.id, created_by: 1, role_title: 'Role',
                    vacancy_skills_attributes: rows.map { |label, level| { skill_label: label, expected_level: level } })
  end

  def build(vacancy)
    described_class.new(portfolio: portfolio, vacancy: vacancy, gemini_client: client).call.skill_comparisons
  end

  it '[018/AC-1] keeps both requirements when two skills share a label' do
    comparisons = build(vacancy_with(['Skill', 3], ['Skill', 5]))

    expect(comparisons.map { |c| [c['skill_label'], c['expected_level'], c['result']] })
      .to eq([['Skill', 3, 'exceed'], ['Skill', 5, 'gap']])
  end

  it '[018/AC-2] keeps one comparison per skill, in saved order, when labels differ' do
    portfolio.portfolio_skills.create!(skill_label: 'Other', ai_level: 2, ai_confidence: 'low',
                                       evidence: [], competency_summary: 'summary')

    comparisons = build(vacancy_with(['Other', 2], ['Skill', 4]))

    expect(comparisons.map { |c| [c['skill_label'], c['result']] }).to eq([%w[Other match], %w[Skill match]])
  end
end
