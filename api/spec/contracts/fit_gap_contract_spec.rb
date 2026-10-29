# frozen_string_literal: true

require 'rails_helper'

# Spec 010 (010/AC-4, AC-5): the fit/gap read has exactly the fields of the shared sample the web app is tested against
# (contracts/fit-gap-report.json), and a level changed by an assessor is flagged.
RSpec.describe 'Fit/gap contract with the web app', type: :request do
  sample = JSON.parse(File.read(Rails.root.join('..', 'contracts', 'fit-gap-report.json')))

  let(:tenant) { create_tenant }
  let(:session) { create_interview_session(tenant, status: 'ended') }
  let(:portfolio) { create_portfolio(session) }
  let(:vacancy) do
    Vacancy.create!(tenant_id: tenant.id, created_by: 1, role_title: 'Role',
                    vacancy_skills_attributes: [{ skill_label: 'Skill', expected_level: 3 },
                                                { skill_label: 'Other', expected_level: 3 }])
  end

  before do
    portfolio.portfolio_skills.create!(skill_label: 'Other', ai_level: 2, ai_confidence: 'low',
                                       evidence: [], competency_summary: 'summary')
    client = instance_double(Gemini::HttpClient,
                             generate_content: { 'culture_narrative' => 'c', 'overall_narrative' => 'o' })
    FitGap::Engine.new(portfolio: portfolio, vacancy: vacancy, gemini_client: client).call
  end

  def kind(value)
    case value
    when nil then :null
    when true, false then :boolean
    when Numeric then :number
    else :string
    end
  end

  def read_report
    get "/api/v1/portfolios/#{portfolio.id}/fitgap/#{vacancy.id}", headers: auth_headers(tenant)
    JSON.parse(response.body).fetch('report')
  end

  it '[010/AC-4] returns the fields of the sample, with the same kind of value in each' do
    report = read_report

    expect(report.keys).to match_array(sample.keys)
    sample_kinds = sample['skill_comparisons'].flat_map(&:to_a).group_by(&:first).transform_values { |pairs| pairs.map { |_, v| kind(v) }.uniq }
    report['skill_comparisons'].each do |comparison|
      expect(comparison.keys).to match_array(sample['skill_comparisons'].first.keys)
      comparison.each { |key, value| expect(sample_kinds.fetch(key)).to include(kind(value)), "#{key} holds #{value.inspect}" }
    end
    report.slice('id', 'portfolio_id', 'vacancy_id', 'generation_status', 'generation_error', 'generated_at').each do |key, value|
      expect(kind(sample[key])).to eq(kind(value)), "#{key} holds #{value.inspect}"
    end
  end

  it '[010/AC-5] flags the comparison of an overridden skill and no other' do
    skill = portfolio.portfolio_skills.find_by!(skill_label: 'Skill')
    AssessorOverride.create!(portfolio_skill: skill, ai_level: 3, override_level: 5, overridden_by: 1)
    FitGap::Engine.new(portfolio: portfolio.reload, vacancy: vacancy,
                       gemini_client: instance_double(Gemini::HttpClient, generate_content: {})).call

    flags = read_report['skill_comparisons'].to_h { |c| [c['skill_label'], c['is_override']] }

    expect(flags).to eq('Skill' => true, 'Other' => false)
  end
end
