# frozen_string_literal: true

require 'rails_helper'

# Spec 006 (006/AC-1 to 006/AC-4): a skill becomes covered only when the model's judgement says so.
RSpec.describe CoverageAnalyzerWorker do
  let(:tenant) { create_tenant }
  let(:interview) do
    create_interview_session(tenant).tap do |session|
      session.update!(status: 'active', started_at: 10.minutes.ago)
      session.transcript_turns.create!(turn_number: 1, speaker: 'candidate', text: 'an answer')
    end
  end

  def cover(label, state, probes)
    interview.coverage_maps.create!(skill_label: label, state: state, probe_count: probes)
  end

  # The model is stubbed with a fixed answer; expecting the call proves the job really ran, because the job
  # swallows its own errors and a silent failure would otherwise look like "nothing changed".
  def run_job(skill_updates: [])
    answer = { 'skill_updates' => skill_updates, 'discovered_skills' => [] }
    expect_any_instance_of(Gemini::HttpClient).to receive(:generate_content).and_return(answer)
    described_class.new.perform(interview.id, 1)
  end

  def proposal(id, state, probes)
    { 'id' => id, 'new_state' => state, 'new_probe_count' => probes, 'reason' => 'test' }
  end

  it '[006/AC-1] leaves a partial skill that was not discussed as partial, even after five probes' do
    skill = cover('Skill A', 'partial', 5)

    run_job

    expect(skill.reload.state).to eq('partial')
  end

  it '[006/AC-2] does not report all skills covered while a stale partial skill remains' do
    cover('Skill A', 'covered', 3)
    cover('Skill B', 'partial', 5)

    run_job

    expect(Coverage::MapInjector.new(interview).all_covered?).to be(false)
  end

  it '[006/AC-3] makes a partial skill covered when the model judges it covered after two probes' do
    skill = cover('Skill A', 'partial', 2)

    run_job(skill_updates: [proposal('skill-a', 'covered', 2)])

    expect(skill.reload.state).to eq('covered')
  end

  it '[006/AC-4] does not move a skill probed once past initiated, whatever the model proposes' do
    skill = cover('Skill A', 'initiated', 1)

    run_job(skill_updates: [proposal('skill-a', 'covered', 1)])

    expect(skill.reload.state).to eq('initiated')
  end
end
