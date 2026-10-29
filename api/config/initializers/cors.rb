# frozen_string_literal: true

require_relative '../allowed_origins'

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins AllowedOrigins.parse(ENV['ALLOWED_ORIGINS'])
    resource '*',
             headers: :any,
             methods: %i[get post put patch delete options head],
             expose: ['Authorization'],
             credentials: false
  end
end
