# frozen_string_literal: true

require 'rails_helper'

# Spec 026 (026/AC-5): a controller comment that names a route names one that exists.
RSpec.describe 'Route comments in the controllers' do
  COMMENT = %r{^\s*#\s*(GET|POST|PUT|PATCH|DELETE)\s+(/api/v1/\S+)}

  def named_routes
    Dir[Rails.root.join('app/controllers/**/*.rb')].flat_map do |file|
      File.readlines(file).filter_map do |line|
        next unless (m = line.match(COMMENT))

        { where: "#{File.basename(file)}: #{line.strip}", verb: m[1].downcase.to_sym, path: m[2].gsub(/:\w+/, '1') }
      end
    end
  end

  def answered?(route)
    found = Rails.application.routes.recognize_path(route[:path], method: route[:verb])
    found[:controller] != 'routing_errors'
  rescue ActionController::RoutingError
    false
  end

  it '[026/AC-5] has a route for every route a comment names' do
    routes = named_routes
    expect(routes.size).to be >= 10

    expect(routes.reject { |route| answered?(route) }.map { |route| route[:where] }).to eq([])
  end
end
