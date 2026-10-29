# frozen_string_literal: true

require 'rails_helper'

# Spec 023 (023/AC-1, AC-2): every request the web app's services make is answered by a route the API has.
RSpec.describe 'Web app requests against the API routes' do
  SERVICES = Rails.root.join('..', 'web', 'src', 'services').freeze
  CALL = %r{api\.(get|post|put|patch|delete)\b[^(]*\(\s*(["`])(/[^"`]*)\2}m

  def calls
    Dir[SERVICES.join('*.ts')].reject { |f| f.end_with?('.test.ts') }.flat_map do |file|
      File.read(file).scan(CALL).map do |verb, _quote, path|
        { file: File.basename(file), verb: verb.to_sym, path: path.gsub(/\$\{[^}]*\}/, '1').sub(/\?.*/, '') }
      end
    end
  end

  def answered?(call)
    route = Rails.application.routes.recognize_path("/api/v1#{call[:path]}", method: call[:verb])
    route[:controller] != 'routing_errors'
  rescue ActionController::RoutingError
    false
  end

  it '[023/AC-1] finds the requests the web app makes, so the check below cannot pass on an empty list' do
    expect(calls.size).to be >= 25
    expect(calls.map { |c| c[:file] }.uniq).to include('assessments.ts', 'sessions.ts', 'portfolios.ts', 'vacancies.ts')
  end

  it '[023/AC-2] has a route for every request the web app makes' do
    missing = calls.reject { |call| answered?(call) }.map { |c| "#{c[:verb].upcase} #{c[:path]} (#{c[:file]})" }

    expect(missing).to eq([])
  end
end
