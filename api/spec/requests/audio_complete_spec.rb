# frozen_string_literal: true

require 'rails_helper'

# Spec 004 (004/AC-1 to 004/AC-5): the candidate link can only end a running session, and the stored reason is true.
RSpec.describe 'Ending a session from the candidate link', type: :request do
  let(:tenant) { create_tenant }
  let(:interview) { create_interview_session(tenant) }

  def finish(token)
    post "/api/v1/sessions/#{token}/audio_complete"
  end

  def start(session)
    session.update!(status: 'active', started_at: 5.minutes.ago)
  end

  def cover(session, *states)
    states.each_with_index do |state, index|
      session.coverage_maps.create!(skill_label: "Skill #{index}", state: state, probe_count: state == 'not_yet' ? 0 : 3)
    end
  end

  it '[004/AC-1] refuses a session that was never started and changes nothing' do
    expect { finish(interview.invite_token) }.not_to change { [Portfolio.count, PortfolioGeneratorWorker.jobs.size] }

    expect(response).to have_http_status(:unprocessable_entity)
    expect(interview.reload.status).to eq('pending')
    expect(interview.end_reason).to be_nil
  end

  it '[004/AC-2] ends a running session with all skills covered as all_covered and queues one job' do
    start(interview)
    cover(interview, 'covered', 'covered')

    expect { finish(interview.invite_token) }.to change(PortfolioGeneratorWorker.jobs, :size).by(1)

    expect(response).to have_http_status(:ok)
    interview.reload
    expect(interview.status).to eq('ended')
    expect(interview.end_reason).to eq('all_covered')
    expect(interview.portfolio.generation_status).to eq('pending')
  end

  it '[004/AC-3] ends a running session with an uncovered skill as manual_candidate, never all_covered' do
    start(interview)
    cover(interview, 'covered', 'partial')

    expect { finish(interview.invite_token) }.to change(PortfolioGeneratorWorker.jobs, :size).by(1)

    expect(response).to have_http_status(:ok)
    expect(interview.reload.end_reason).to eq('manual_candidate')
  end

  it '[004/AC-4] answers already ended for an ended session and leaves it untouched' do
    interview.update!(status: 'ended', end_reason: 'manual_assessor', ended_at: Time.current)

    expect { finish(interview.invite_token) }.not_to change(PortfolioGeneratorWorker.jobs, :size)

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to include('ended' => true)
    expect(interview.reload.end_reason).to eq('manual_assessor')
  end

  it '[004/AC-5] answers 404 for a token that matches no session' do
    finish('0' * 64)

    expect(response).to have_http_status(:not_found)
  end
end
