# frozen_string_literal: true

require 'rails_helper'

# Spec 007 (007/AC-1, AC-2, AC-5, AC-6): a report is replaced, never deleted first, and never queued twice.
RSpec.describe 'Fit/gap regeneration', type: :request do
  let(:tenant) { create_tenant }
  let(:portfolio) { create_portfolio(create_interview_session(tenant, status: 'ended')) }
  let(:vacancy) { create_vacancy(tenant) }
  let(:json) { { 'Content-Type' => 'application/json' } }
  let(:headers) { auth_headers(tenant).merge(json) }

  def regenerate
    post "/api/v1/portfolios/#{portfolio.id}/regenerate_fitgap", params: { vacancy_id: vacancy.id }.to_json, headers: headers
  end

  def request_report
    post "/api/v1/portfolios/#{portfolio.id}/fitgap", params: { vacancy_id: vacancy.id }.to_json, headers: headers
  end

  def override
    skill = portfolio.portfolio_skills.first
    post "/api/v1/portfolio_skills/#{skill.id}/override", params: { override: { override_level: 5 } }.to_json, headers: headers
  end

  def read_report
    get "/api/v1/portfolios/#{portfolio.id}/fitgap/#{vacancy.id}", headers: headers
  end

  def stored_report
    FitGapReport.find_by(portfolio_id: portfolio.id, vacancy_id: vacancy.id)
  end

  { 'saving an override' => :override, 'asking to regenerate' => :regenerate }.each do |action, name|
    it "[007/AC-1] keeps the report, marks it pending and queues one job when #{action}" do
      create_report(portfolio, vacancy)

      expect { send(name) }.to change(FitGapGeneratorWorker.jobs, :size).by(1)

      expect(stored_report).not_to be_nil
      expect(stored_report.generation_status).to eq('pending')
      expect(stored_report.skill_comparisons).to eq(TenantHelpers::COMPARISONS)
    end
  end

  it '[007/AC-1] keeps showing the previous report while it is pending' do
    create_report(portfolio, vacancy)
    override

    read_report

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body).fetch('report')
    expect(body['skill_comparisons']).to eq(TenantHelpers::COMPARISONS)
    expect(body['generation_status']).to eq('pending')
  end

  %w[pending generating].each do |status|
    it "[007/AC-2] queues nothing when asking to regenerate a report that is #{status}" do
      create_report(portfolio, vacancy, status: status)

      expect { regenerate }.not_to change(FitGapGeneratorWorker.jobs, :size)
    end

    it "[007/AC-2] queues nothing when an override is saved on a report that is #{status}" do
      create_report(portfolio, vacancy, status: status)

      expect { override }.not_to change(FitGapGeneratorWorker.jobs, :size)
    end
  end

  it '[007/AC-2] queues one job and creates one report when the page asks twice and none exists' do
    request_report
    request_report

    expect(FitGapGeneratorWorker.jobs.size).to eq(1)
    expect(FitGapReport.where(portfolio_id: portfolio.id, vacancy_id: vacancy.id).count).to eq(1)
  end

  it '[007/AC-5] reads a failed report as 200 with its status and error' do
    create_report(portfolio, vacancy, status: 'failed', error: 'model unavailable')

    read_report

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body).fetch('report')
    expect(body).to include('generation_status' => 'failed', 'generation_error' => 'model unavailable')
  end

  it '[007/AC-5] reads a failed report that never produced comparisons as 200 too' do
    create_report(portfolio, vacancy, status: 'failed', comparisons: [], error: 'model unavailable')

    read_report

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig('report', 'generation_status')).to eq('failed')
  end

  %w[pending generating].each do |status|
    it "[007/AC-6] answers 404 for a #{status} report that never produced comparisons" do
      create_report(portfolio, vacancy, status: status, comparisons: [])

      read_report

      expect(response).to have_http_status(:not_found)
    end
  end

  it '[007/AC-6] still answers 404 when there is no report and 200 for a complete one' do
    read_report
    expect(response).to have_http_status(:not_found)

    create_report(portfolio, vacancy)
    read_report
    expect(response).to have_http_status(:ok)
  end
end
