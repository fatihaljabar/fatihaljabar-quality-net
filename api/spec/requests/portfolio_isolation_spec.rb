# frozen_string_literal: true

require 'rails_helper'

# Spec 003 (003/AC-1 to 003/AC-3): portfolios, skills, fit/gap reports and overrides never cross tenants.
RSpec.describe 'Tenant isolation on portfolios', type: :request do
  let(:tenant_a) { create_tenant }
  let(:tenant_b) { create_tenant }
  let!(:portfolio_a) { create_portfolio(create_interview_session(tenant_a, status: 'ended')) }
  let!(:portfolio_b) { create_portfolio(create_interview_session(tenant_b, status: 'ended')) }
  let(:vacancy_a) { create_vacancy(tenant_a) }
  let(:json) { { 'Content-Type' => 'application/json' } }
  let(:headers_a) { auth_headers(tenant_a).merge(json) }

  # Every endpoint that takes a portfolio or a portfolio skill id, called with the given ids.
  def call_endpoints(portfolio, vacancy)
    skill = portfolio.portfolio_skills.first
    {
      export: -> { get "/api/v1/portfolios/#{portfolio.id}/export", params: { format: 'json' }, headers: headers_a },
      fitgap_read: -> { get "/api/v1/portfolios/#{portfolio.id}/fitgap/#{vacancy.id}", headers: headers_a },
      fitgap_create: -> { post "/api/v1/portfolios/#{portfolio.id}/fitgap", params: { vacancy_id: vacancy.id }.to_json, headers: headers_a },
      fitgap_regenerate: -> { post "/api/v1/portfolios/#{portfolio.id}/regenerate_fitgap", params: { vacancy_id: vacancy.id }.to_json, headers: headers_a },
      override: -> { post "/api/v1/portfolio_skills/#{skill.id}/override", params: { override: { override_level: 1 } }.to_json, headers: headers_a }
    }
  end

  %i[export fitgap_read fitgap_create fitgap_regenerate override].each do |endpoint|
    it "[003/AC-1] answers 404 and changes nothing for #{endpoint} on a portfolio of another tenant" do
      create_report(portfolio_b, vacancy_a)

      expect do
        call_endpoints(portfolio_b, vacancy_a).fetch(endpoint).call
      end.not_to change { [AssessorOverride.count, FitGapReport.count, FitGapGeneratorWorker.jobs.size] }

      expect(response).to have_http_status(:not_found)
    end
  end

  it '[003/AC-2] keeps every endpoint working for the tenant that owns the portfolio' do
    create_report(portfolio_a, vacancy_a)

    call_endpoints(portfolio_a, vacancy_a).each do |name, call|
      call.call
      expect(response.status).to be_between(200, 202), "#{name} returned #{response.status} for the owner"
    end
  end

  it '[003/AC-3] gives the same answer for an id of another tenant and an id that exists nowhere' do
    get "/api/v1/portfolios/#{portfolio_b.id}/fitgap/#{vacancy_a.id}", headers: headers_a
    foreign = [response.status, response.body]

    get "/api/v1/portfolios/#{portfolio_b.id + 10_000}/fitgap/#{vacancy_a.id}", headers: headers_a
    missing = [response.status, response.body]

    expect(foreign).to eq(missing)
  end
end
