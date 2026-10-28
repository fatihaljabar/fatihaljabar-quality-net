# frozen_string_literal: true

require 'rails_helper'

# Spec 002 (AC-4): ending a session stores the outcome and queues portfolio generation exactly once.
RSpec.describe 'Ending a session', type: :request do
  let(:tenant) { create_tenant }
  let!(:session) { create_interview_session(tenant) }

  it '[AC-4] stores the session as ended with the requested reason and queues one portfolio job' do
    expect do
      post "/api/v1/sessions/#{session.id}/end_session",
           params: { session: { reason: 'manual_assessor' } }.to_json,
           headers: auth_headers(tenant).merge('Content-Type' => 'application/json')
    end.to change(PortfolioGeneratorWorker.jobs, :size).by(1)

    expect(response).to have_http_status(:ok)
    session.reload
    expect(session.status).to eq('ended')
    expect(session.end_reason).to eq('manual_assessor')
    expect(session.portfolio.generation_status).to eq('pending')
    expect(PortfolioGeneratorWorker.jobs.last['args']).to eq([session.id])
  end

  it '[AC-4] refuses to end a session that is already ended and queues nothing' do
    session.update!(status: 'ended', end_reason: 'manual_assessor', ended_at: Time.current)

    expect do
      post "/api/v1/sessions/#{session.id}/end_session",
           params: { session: { reason: 'manual_assessor' } }.to_json,
           headers: auth_headers(tenant).merge('Content-Type' => 'application/json')
    end.not_to change(PortfolioGeneratorWorker.jobs, :size)

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
