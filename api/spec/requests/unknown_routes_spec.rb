# frozen_string_literal: true

require 'rails_helper'

# Spec 012 (012/AC-1 to AC-3): a path no route matches is answered with a JSON 404, and known routes are unaffected.
RSpec.describe 'Unknown routes', type: :request do
  def expect_json_404
    expect(response).to have_http_status(:not_found)
    expect(response.media_type).to eq('application/json')
    expect(response.body).not_to include('<html')
    expect(JSON.parse(response.body)).to eq('errors' => [{ 'status' => 404, 'message' => 'Route not found' }])
  end

  {
    'GET /interview/abc-token' => [:get, '/interview/abc-token'],
    'GET /api/v1/does-not-exist' => [:get, '/api/v1/does-not-exist'],
    'POST /api/v1/assessments/1/nothing' => [:post, '/api/v1/assessments/1/nothing'],
    'DELETE /something.json' => [:delete, '/something.json']
  }.each do |name, (verb, path)|
    it "[012/AC-1] answers #{name} with a JSON 404" do
      send(verb, path)

      expect_json_404
    end
  end

  it '[012/AC-2] answers the root path with a JSON 404' do
    get '/'

    expect_json_404
  end

  it '[012/AC-3] leaves known routes as they were' do
    get '/health'
    expect(response).to have_http_status(:ok)

    get '/api/v1/health'
    expect(response).to have_http_status(:ok)

    tenant = create_tenant
    get '/api/v1/assessments', headers: { 'X-Tenant-Scheme' => tenant.scheme }
    expect(response).to have_http_status(:unauthorized)

    get '/api/v1/assessments', headers: auth_headers(tenant)
    expect(response).to have_http_status(:ok)
  end
end
