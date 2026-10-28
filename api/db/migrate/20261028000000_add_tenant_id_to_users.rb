# frozen_string_literal: true

# Ties each user to one tenant (spec 003, audit finding A2). Existing users are assigned to the first
# non-default organization, which is what the login endpoint implicitly did before. Fails loudly when
# users exist but there is no organization to assign them to, instead of guessing.
class AddTenantIdToUsers < ActiveRecord::Migration[7.0]
  def up
    add_column :users, :tenant_id, :bigint

    execute <<~SQL.squish
      UPDATE users
      SET tenant_id = (SELECT id FROM public.organizations WHERE id <> 0 ORDER BY id LIMIT 1)
      WHERE tenant_id IS NULL
    SQL

    unassigned = select_value('SELECT COUNT(*) FROM users WHERE tenant_id IS NULL').to_i
    raise "#{unassigned} users exist but there is no organization to assign them to" if unassigned.positive?

    change_column_null :users, :tenant_id, false
    add_index :users, :tenant_id
  end

  def down
    remove_index :users, :tenant_id
    remove_column :users, :tenant_id
  end
end
