# frozen_string_literal: true

ENV['RAILS_ENV'] ||= 'test'
require 'spec_helper'
require_relative '../config/environment'
abort('The Rails environment is running in production mode!') if Rails.env.production?
require 'rspec/rails'
require 'sidekiq/testing'

Dir[Rails.root.join('spec/support/**/*.rb')].sort.each { |file| require file }

RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_run_when_matching :focus

  # Jobs are captured, never executed: no example may reach Gemini or wait on a worker.
  config.before do
    Sidekiq::Testing.fake!
    Sidekiq::Worker.clear_all
  end

  # The throttle counters live in Redis and outlive the example, so repeated logins in one run, or in runs
  # within a minute of each other, would hit the limit and fail unrelated examples. Each example gets its own store.
  config.before { Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new }

  config.after { RequestStore.clear! }
end
