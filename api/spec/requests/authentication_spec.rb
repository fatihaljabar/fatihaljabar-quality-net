# frozen_string_literal: true

require 'rails_helper'

# Spec 002 (AC-3): protected endpoints reject missing and malformed tokens.
RSpec.describe 'Authentication on protected endpoints', type: :request do
  let(:tenant) { create_tenant }
  let(:tenant_header) { { 'X-Tenant-Scheme' => tenant.scheme } }

  it '[002/AC-3] returns 401 when no token is sent' do
    get '/api/v1/assessments', headers: tenant_header

    expect(response).to have_http_status(:unauthorized)
  end

  it '[002/AC-3] returns 401 when the token is malformed' do
    get '/api/v1/assessments', headers: tenant_header.merge('Authorization' => 'Bearer not-a-jwt')

    expect(response).to have_http_status(:unauthorized)
  end

  it '[002/AC-3] returns 401 when the token is signed with another secret' do
    forged = JWT.encode({ user_id: 1, role: 'admin', scheme: tenant.scheme, exp: 1.hour.from_now.to_i }, 'wrong-secret', 'HS256')

    get '/api/v1/assessments', headers: { 'Authorization' => "Bearer #{forged}" }

    expect(response).to have_http_status(:unauthorized)
  end
end
