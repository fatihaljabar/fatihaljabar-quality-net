# frozen_string_literal: true

# Answers paths no route matches (spec 012). Inherits the bare API controller, not ApplicationController, so an unknown
# path needs no tenant and no token to learn that it is unknown.
class RoutingErrorsController < ActionController::API
  include Response

  def not_found
    json_error('Route not found', :not_found)
  end
end
