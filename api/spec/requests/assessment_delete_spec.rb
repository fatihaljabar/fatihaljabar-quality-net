# frozen_string_literal: true

require 'rails_helper'

# Spec 013 (013/AC-1 to AC-3): deleting an assessment reports what really happened.
RSpec.describe 'Deleting an assessment', type: :request do
  let(:tenant) { create_tenant }
  let(:headers) { auth_headers(tenant) }

  it '[013/AC-1] answers 422 and keeps an assessment that has a session' do
    session = create_interview_session(tenant)
    assessment = session.assessment

    delete "/api/v1/assessments/#{assessment.id}", headers: headers

    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body).dig('errors', 0, 'message')).to be_present
    expect(Assessment.exists?(assessment.id)).to be(true)
    expect(Session.exists?(session.id)).to be(true)
  end

  it '[013/AC-2] deletes an assessment with no sessions' do
    assessment = create_assessment(tenant)

    delete "/api/v1/assessments/#{assessment.id}", headers: headers

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)['message']).to eq('Assessment deleted')
    expect(Assessment.exists?(assessment.id)).to be(false)
  end

  it '[013/AC-3] answers 404 for an assessment of another company and deletes nothing' do
    other = create_assessment(create_tenant)

    delete "/api/v1/assessments/#{other.id}", headers: headers

    expect(response).to have_http_status(:not_found)
    expect(Assessment.unscoped.exists?(other.id)).to be(true)
  end
end
