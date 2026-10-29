# frozen_string_literal: true

require 'rails_helper'
require 'yaml'
require Rails.root.join('config/allowed_origins')

# Spec 024 (024/AC-1 to AC-5): the allowed web origins are explicit in production.
RSpec.describe AllowedOrigins do
  it '[024/AC-1] refuses * in production, alone or inside a list, naming the variable' do
    ['*', 'http://a.test,*'].each do |value|
      expect { described_class.parse(value, production: true) }.to raise_error(ArgumentError, /ALLOWED_ORIGINS/)
    end
  end

  it '[024/AC-2] refuses a missing, empty or separator-only value and says to list the web app origins' do
    [nil, '', ' , ,'].each do |value|
      expect { described_class.parse(value, production: false) }
        .to raise_error(ArgumentError, /ALLOWED_ORIGINS.*origins/m)
    end
  end

  it '[024/AC-3] splits and trims a list, keeping its order' do
    expect(described_class.parse(' http://a.test , http://b.test ', production: true)).to eq(%w[http://a.test http://b.test])
  end

  it '[024/AC-4] accepts * outside production' do
    expect(described_class.parse('*', production: false)).to eq(['*'])
  end

  it '[024/AC-5] has a sample that names the local web app and not everyone' do
    sample = YAML.safe_load(File.read(Rails.root.join('config/application.yml.sample')))

    expect(sample['ALLOWED_ORIGINS']).to eq('http://localhost:5173')
  end
end
