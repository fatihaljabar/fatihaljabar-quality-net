# frozen_string_literal: true

# Reads the ALLOWED_ORIGINS setting (spec 024). Loaded by the CORS initializer; it lives under config/ so the autoloader does
# not manage it.
module AllowedOrigins
  def self.parse(value, production: Rails.env.production?)
    origins = value.to_s.split(',').map(&:strip).reject(&:empty?)
    if origins.empty?
      raise ArgumentError, 'ALLOWED_ORIGINS is missing or empty: list the origins of the web app, comma separated'
    end
    if production && origins.include?('*')
      raise ArgumentError, 'ALLOWED_ORIGINS must list the origins of the web app in production, not *'
    end

    origins
  end
end
