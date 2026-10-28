# frozen_string_literal: true

require 'rails_helper'

# Spec 005 (005/AC-1 to 005/AC-4, 005/AC-6): the portfolio only states what the interview supports.
RSpec.describe Portfolios::Generator do
  let(:tenant) { create_tenant }
  let(:interview) { create_interview_session(tenant, status: 'ended') }

  def cover(label, state, probes, discovered: false)
    interview.coverage_maps.create!(skill_label: label, state: state, probe_count: probes, is_discovered: discovered)
  end

  def model_skill(label, level: 3, confidence: 'high', evidence: ['quote'])
    { 'skill_id' => nil, 'skill_label' => label, 'level' => level, 'confidence' => confidence,
      'evidence' => evidence, 'competency_summary' => 'summary' }
  end

  def generate(configured: [], discovered: [])
    client = instance_double(Gemini::HttpClient,
                             generate_content: { 'configured_skills' => configured, 'discovered_skills' => discovered })
    described_class.new(session: interview, gemini_client: client).call
  end

  it '[005/AC-1] stores nothing for a skill the interview never reached, and still completes' do
    cover('Skill A', 'not_yet', 0)

    portfolio = generate(configured: [model_skill('Skill A', level: 3)])

    expect(portfolio.generation_status).to eq('complete')
    expect(portfolio.portfolio_skills).to be_empty
  end

  [nil, 0, 9, 'n/a', ''].each do |level|
    it "[005/AC-2] stores nothing, and not level 1, when the model answers #{level.inspect} as the level" do
      cover('Skill A', 'covered', 3)

      portfolio = generate(configured: [model_skill('Skill A', level: level)])

      expect(portfolio.portfolio_skills.map(&:ai_level)).to be_empty
    end
  end

  it '[005/AC-3] computes the confidence from the coverage data, whatever the model says' do
    cover('Covered three', 'covered', 3)
    cover('Covered two', 'covered', 2)
    cover('Partial four', 'partial', 4)
    cover('Initiated one', 'initiated', 1)
    labels = ['Covered three', 'Covered two', 'Partial four', 'Initiated one']

    portfolio = generate(configured: labels.map { |label| model_skill(label, confidence: 'high') })

    stored = portfolio.portfolio_skills.to_h { |skill| [skill.skill_label, skill.ai_confidence] }
    expect(stored).to eq('Covered three' => 'high', 'Covered two' => 'medium',
                         'Partial four' => 'medium', 'Initiated one' => 'low')
  end

  it '[005/AC-4] stores a discovered skill only when the coverage map knows it, with computed confidence' do
    cover('Skill A', 'covered', 3)
    cover('Micro frontends', 'partial', 2, discovered: true)

    portfolio = generate(
      configured: [model_skill('Skill A')],
      discovered: [model_skill('Micro frontends', confidence: 'high'), model_skill('Invented skill')]
    )

    discovered = portfolio.portfolio_skills.where(is_discovered: true).to_h { |s| [s.skill_label, s.ai_confidence] }
    expect(discovered).to eq('Micro frontends' => 'medium')
  end

  it '[005/AC-6] stores a valid level as given and keeps at most three evidence quotes' do
    cover('Skill A', 'covered', 3)

    portfolio = generate(configured: [model_skill('Skill A', level: 4, evidence: %w[a b c d e])])

    skill = portfolio.portfolio_skills.first
    expect(skill.ai_level).to eq(4)
    expect(skill.evidence).to eq(%w[a b c])
  end

  it '[005/AC-6] accepts a level written with an L prefix' do
    cover('Skill A', 'covered', 3)

    portfolio = generate(configured: [model_skill('Skill A', level: 'L3')])

    expect(portfolio.portfolio_skills.first.ai_level).to eq(3)
  end
end
