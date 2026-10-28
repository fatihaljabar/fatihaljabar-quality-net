# frozen_string_literal: true

module Api
  module V1
    class AuthenticationController < ApiController
      skip_before_action :require_tenant!

      # POST /api/v1/auth/login
      # A user can only obtain a token for the tenant they belong to (spec 003). An X-Tenant-Scheme header is
      # optional and must name that same tenant; any mismatch looks exactly like a wrong password.
      def authenticate
        user = User.find_by(email: params[:email].to_s.downcase)

        return invalid_login unless user&.authenticate(params[:password]) && user.role == 'admin'

        organization = Organization.find_by(id: user.tenant_id)
        return invalid_login unless organization && requested_tenant_allowed?(user)

        token = JsonWebToken.encode({ user_id: user.id, role: user.role, scheme: organization.scheme })

        json_response({ token:, user: { id: user.id, email: user.email, role: user.role } })
      end

      private

      def requested_tenant_allowed?(user)
        requested = request.headers['X-Tenant-Scheme'].presence
        requested.nil? || Organization.identify(requested)&.id == user.tenant_id
      end

      def invalid_login
        json_error('Invalid email or password', :unauthorized)
      end
    end
  end
end
