# frozen_string_literal: true

require 'rails_helper'

# Spec 002 (AC-2): sessions are tenant scoped. This is the control case: it works today and must keep working.
RSpec.describe 'Tenant isolation on sessions', type: :request do
  let(:tenant_a) { create_tenant }
  let(:tenant_b) { create_tenant }
  let!(:session_b) { create_interview_session(tenant_b) }

  it '[AC-2] returns 404 when an admin of one tenant requests a session of another tenant' do
    get "/api/v1/sessions/#{session_b.id}", headers: auth_headers(tenant_a)

    expect(response).to have_http_status(:not_found)
    expect(response.body).not_to include(session_b.invite_token)
  end

  it '[AC-2] still returns the session to its own tenant' do
    get "/api/v1/sessions/#{session_b.id}", headers: auth_headers(tenant_b)

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig('session', 'id')).to eq(session_b.id)
  end
end
