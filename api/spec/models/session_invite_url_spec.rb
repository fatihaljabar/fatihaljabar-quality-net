# frozen_string_literal: true

require 'rails_helper'
require 'yaml'

# Spec 025 (025/AC-1 to AC-4): an invite link opens the web app, and the settings that build it agree.
RSpec.describe Session, 'invite link' do
  let(:tenant) { create_tenant }
  let(:interview) { create_interview_session(tenant) }

  around do |example|
    saved = ENV['APP_BASE_URL']
    example.run
    saved ? ENV['APP_BASE_URL'] = saved : ENV.delete('APP_BASE_URL')
  end

  it '[025/AC-1] points at the web app by default and ends with the interview path and the token' do
    ENV.delete('APP_BASE_URL')

    expect(interview.invite_url).to eq("http://localhost:5173/interview/#{interview.invite_token}")
  end

  it '[025/AC-2] starts with the configured base address' do
    ENV['APP_BASE_URL'] = 'https://app.example.test'

    expect(interview.invite_url).to eq("https://app.example.test/interview/#{interview.invite_token}")
  end

  it '[025/AC-3] has a sample where the invite base is the allowed web origin' do
    sample = YAML.safe_load(File.read(Rails.root.join('config/application.yml.sample')))

    expect(sample['APP_BASE_URL']).to eq(sample['ALLOWED_ORIGINS'])
  end

  it '[025/AC-4] has a production manifest where the invite base is the allowed web origin' do
    data = YAML.safe_load(File.read(Rails.root.join('k8s/configmap.yaml'))).fetch('data')

    expect(data['APP_BASE_URL']).to eq(data['ALLOWED_ORIGINS'])
  end
end
