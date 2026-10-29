# frozen_string_literal: true

require 'rails_helper'

# Spec 019 (019/AC-1 to AC-4): regenerating a portfolio is all or nothing and keeps what an assessor decided.
RSpec.describe Portfolios::Generator do
  let(:tenant) { create_tenant }
  let(:interview) { create_interview_session(tenant, status: 'ended') }

  def cover(label, probes: 3)
    interview.coverage_maps.create!(skill_label: label, state: 'covered', probe_count: probes, is_discovered: false)
  end

  def model_skill(label, level:, evidence: ['quote'])
    { 'skill_id' => nil, 'skill_label' => label, 'level' => level, 'evidence' => evidence, 'competency_summary' => 'summary' }
  end

  def generate(*skills)
    client = instance_double(Gemini::HttpClient,
                             generate_content: { 'configured_skills' => skills, 'discovered_skills' => [] })
    described_class.new(session: interview, gemini_client: client).call
  end

  def override!(portfolio, label, to:)
    skill = portfolio.portfolio_skills.find_by!(skill_label: label)
    AssessorOverride.create!(portfolio_skill: skill, ai_level: skill.ai_level, override_level: to,
                             assessor_notes: 'checked by hand', overridden_by: 1)
  end

  before do
    cover('Skill A')
    cover('Skill B')
  end

  it '[019/AC-1] keeps the override of a skill that is still in the answer and updates its level and evidence' do
    portfolio = generate(model_skill('Skill A', level: 3), model_skill('Skill B', level: 2))
    override = override!(portfolio, 'Skill A', to: 5)

    again = generate(model_skill('Skill A', level: 2, evidence: ['new quote']), model_skill('Skill B', level: 2))

    skill = again.portfolio_skills.find_by!(skill_label: 'Skill A')
    expect(skill.ai_level).to eq(2)
    expect(skill.evidence).to eq(['new quote'])
    expect(skill.assessor_override&.id).to eq(override.id)
    expect(skill.assessor_override.override_level).to eq(5)
  end

  it '[019/AC-2] leaves the previous skills and overrides untouched when the regeneration fails midway' do
    portfolio = generate(model_skill('Skill A', level: 3), model_skill('Skill B', level: 2))
    override!(portfolio, 'Skill A', to: 5)
    before_state = portfolio.portfolio_skills.order(:id).pluck(:id, :skill_label, :ai_level)

    calls = 0
    allow(Coverage::StateEngine).to receive(:confidence).and_wrap_original do |original, **args|
      calls += 1
      raise 'boom' if calls == 2

      original.call(**args)
    end

    expect { generate(model_skill('Skill A', level: 1), model_skill('Skill B', level: 1)) }.to raise_error('boom')

    portfolio.reload
    expect(portfolio.portfolio_skills.order(:id).pluck(:id, :skill_label, :ai_level)).to eq(before_state)
    expect(AssessorOverride.where(portfolio_skill_id: portfolio.portfolio_skills.select(:id)).count).to eq(1)
    expect(portfolio.generation_status).to eq('failed')
  end

  it '[019/AC-3] removes a skill that the new answer does not contain' do
    generate(model_skill('Skill A', level: 3), model_skill('Skill B', level: 2))

    again = generate(model_skill('Skill A', level: 3))

    expect(again.portfolio_skills.map(&:skill_label)).to eq(['Skill A'])
  end

  it '[019/AC-4] adds a skill that the new answer contains' do
    generate(model_skill('Skill A', level: 3))

    again = generate(model_skill('Skill A', level: 3), model_skill('Skill B', level: 2))

    expect(again.portfolio_skills.map(&:skill_label)).to match_array(['Skill A', 'Skill B'])
  end
end
