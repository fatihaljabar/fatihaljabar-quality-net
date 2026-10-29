# frozen_string_literal: true

require 'rails_helper'
require 'open3'

# Spec 002 (AC-5): the application must eager load and boot in production, not only in development.
# Development does not eager load, so a misnamed constant or a setting for an unloaded component
# stays invisible until deploy. This check makes it fail in CI instead.
RSpec.describe 'Application boot' do
  it '[002/AC-5] eager loads every autoloaded file' do
    expect { Rails.application.eager_load! }.not_to raise_error
  end

  it '[002/AC-5] boots in the production environment' do
    env = {
      'RAILS_ENV' => 'production',
      'DB_NAME' => ActiveRecord::Base.connection_db_config.database,
      'SECRET_KEY_BASE' => ENV.fetch('SECRET_KEY_BASE', 'boot-check-only'),
      'GEMINI_API_KEY' => 'boot-check-only',
      'GEMINI_LIVE_MODEL' => 'boot-check-only',
      'GEMINI_FLASH_MODEL' => 'boot-check-only',
      'GEMINI_PRO_MODEL' => 'boot-check-only'
    }

    output, status = Open3.capture2e(env, RbConfig.ruby, Rails.root.join('bin/rails').to_s, 'runner', 'puts "booted"',
                                    chdir: Rails.root.to_s)

    expect(status).to be_success, "production boot failed:\n#{output.lines.first(6).join}"
    expect(output).to include('booted')
  end
end
