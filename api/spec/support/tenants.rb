# frozen_string_literal: true

# Small helpers to build tenants, sessions and signed tokens without a factory library.
module TenantHelpers
  def create_tenant(name: nil)
    key = SecureRandom.hex(4)
    Organization.create!(name: name || "Tenant #{key}", scheme: "tenant-#{key}",
                         identifier: "tenant-#{key}", host: "tenant-#{key}.example.test")
  end

  def create_assessment(tenant)
    Assessment.create!(
      tenant_id: tenant.id, created_by: 1, name: "Assessment #{SecureRandom.hex(3)}", time_limit_min: 10,
      assessment_skills_attributes: [{
        skill_label: 'Skill', display_order: 1, expected_level: 3,
        l1_anchor: 'l1', l2_anchor: 'l2', l3_anchor: 'l3', l4_anchor: 'l4', l5_anchor: 'l5'
      }]
    )
  end

  def create_interview_session(tenant, status: 'pending')
    Session.create!(tenant_id: tenant.id, assessment: create_assessment(tenant), status: status)
  end

  def token_for(tenant, role: 'admin', user_id: 1)
    JsonWebToken.encode({ user_id: user_id, role: role, scheme: tenant.scheme })
  end

  def auth_headers(tenant, **options)
    { 'Authorization' => "Bearer #{token_for(tenant, **options)}" }
  end
end

RSpec.configure { |config| config.include TenantHelpers }
