# frozen_string_literal: true

require 'rails_helper'

# Spec 003 (003/AC-4, 003/AC-5): a user can only obtain a token for the tenant they belong to.
RSpec.describe 'Login and tenants', type: :request do
  # Created first on purpose: the old code picked "the first organization" for a login without a header.
  let!(:tenant_b) { create_tenant }
  let!(:tenant_a) { create_tenant }
  let!(:user) { create_user(tenant_a, email: 'owner@example.test', password: 'correct-horse') }
  let(:credentials) { { email: 'owner@example.test', password: 'correct-horse' }.to_json }
  let(:json) { { 'Content-Type' => 'application/json' } }

  def login(scheme = nil)
    headers = scheme ? json.merge('X-Tenant-Scheme' => scheme) : json
    post '/api/v1/auth/login', params: credentials, headers: headers
  end

  def wrong_password_message
    post '/api/v1/auth/login', params: { email: 'owner@example.test', password: 'nope' }.to_json, headers: json
    JSON.parse(response.body).dig('errors', 0, 'message')
  end

  it '[003/AC-4] refuses a token for another tenant and does not say why' do
    expected = wrong_password_message

    login(tenant_b.scheme)

    expect(response).to have_http_status(:unauthorized)
    expect(response.body).not_to include('token')
    expect(JSON.parse(response.body).dig('errors', 0, 'message')).to eq(expected)
  end

  it '[003/AC-4] refuses a tenant that does not exist' do
    login('does-not-exist')

    expect(response).to have_http_status(:unauthorized)
    expect(response.body).not_to include('token')
  end

  it '[003/AC-5] issues a token for the own tenant when no tenant header is sent' do
    login

    expect(response).to have_http_status(:ok)
    expect(JsonWebToken.decode(JSON.parse(response.body)['token'])[:scheme]).to eq(tenant_a.scheme)
  end

  it '[003/AC-5] issues a token for the own tenant when the header names it' do
    login(tenant_a.scheme)

    expect(response).to have_http_status(:ok)
    expect(JsonWebToken.decode(JSON.parse(response.body)['token'])[:scheme]).to eq(tenant_a.scheme)
  end
end
