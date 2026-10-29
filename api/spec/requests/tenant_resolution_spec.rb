# frozen_string_literal: true

require 'rails_helper'

# Spec 022 (022/AC-1 to AC-4): an unknown or missing tenant is refused even when a default organization exists.
RSpec.describe 'Tenant resolution', type: :request do
  let!(:default_org) do
    Organization.create!(id: 0, name: 'Default', scheme: 'default-org', identifier: 'default-org', host: 'default.example.test')
  end
  let(:tenant) { create_tenant }

  def expect_tenant_not_found
    expect(response).to have_http_status(:forbidden)
    expect(JSON.parse(response.body).dig('errors', 0, 'message')).to match(/Tenant not found/)
  end

  it '[022/AC-1] refuses a scheme that matches no organization, before authentication' do
    get '/api/v1/assessments', headers: { 'X-Tenant-Scheme' => 'no-such-company' }

    expect_tenant_not_found
  end

  it '[022/AC-2] refuses a request that carries no tenant information' do
    get '/api/v1/assessments'

    expect_tenant_not_found
  end

  it '[022/AC-3] identifies a known tenant and goes on to authentication' do
    get '/api/v1/assessments', headers: { 'X-Tenant-Scheme' => tenant.scheme }

    expect(response).to have_http_status(:unauthorized)
  end

  it '[022/AC-4] answers a login with an unknown scheme exactly like a wrong password' do
    user = create_user(tenant)

    json = { 'Content-Type' => 'application/json' }
    post '/api/v1/auth/login', params: { email: user.email, password: 'correct-horse' }.to_json,
                               headers: json.merge('X-Tenant-Scheme' => 'no-such-company')
    unknown_scheme = [response.status, response.body]
    post '/api/v1/auth/login', params: { email: user.email, password: 'wrong' }.to_json, headers: json
    wrong_password = [response.status, response.body]

    expect(unknown_scheme).to eq(wrong_password)
    expect(unknown_scheme.first).to eq(401)
  end
end
