-- Module framework: module_dependencies, set_module_enabled dependency rules and audit entries,
-- update_module_settings permissions and audit, and the modules column privileges.
begin;
\ir ../helpers.psql
select plan(32);

select tests.create_user('c9000000-0000-4000-8000-000000000001', 'admin@t.test', 'super_admin');
select tests.create_user('c9000000-0000-4000-8000-000000000002', 'staff@t.test', 'staff');
select tests.create_user('c9000000-0000-4000-8000-000000000003', 'user@t.test', 'user');
insert into public.staff_permissions (user_id, scope, action)
select 'c9000000-0000-4000-8000-000000000002', 'crm', a
from unnest(enum_range(null::public.permission_action)) as a;

-- module_dependencies ---------------------------------------------------------------------------
select results_eq(
  $$ select module_key, requires_key from public.module_dependencies order by 1, 2 $$,
  $$ values ('email_marketing', 'crm') $$,
  'only email_marketing requires crm'
);
select throws_ok(
  $$ insert into public.module_dependencies values ('crm', 'crm') $$,
  '23514', null, 'a module cannot require itself'
);

select tests.clear_claims();
set local role anon;
select throws_ok($$ select * from public.module_dependencies $$, '42501', null, 'anon cannot read module_dependencies');
select throws_ok($$ select enabled_by from public.modules $$, '42501', null, 'anon cannot read who enabled a module');
select lives_ok($$ select key, enabled, settings from public.modules $$, 'anon reads key, enabled, and settings');
select throws_ok(
  $$ select public.update_module_settings('blog', '{}') $$,
  '42501', null, 'anon cannot call update_module_settings'
);
reset role;

select tests.claims_for('c9000000-0000-4000-8000-000000000003');
set local role authenticated;
select is((select count(*)::int from public.module_dependencies), 1, 'signed-in users can read module_dependencies');
select throws_ok(
  $$ insert into public.module_dependencies values ('shop', 'crm') $$,
  '42501', null, 'users cannot write module_dependencies'
);
select throws_ok(
  $$ select public.update_module_settings('blog', '{"x": 1}') $$,
  '42501', 'Only the super admin can change module settings.', 'users cannot change module settings'
);
reset role;

-- Staff, even with every crm permission, cannot switch modules or change settings --------------
select tests.claims_for('c9000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok(
  $$ select public.set_module_enabled('crm', true) $$,
  '42501', 'Only the super admin can enable or disable modules.', 'staff cannot enable a module'
);
select throws_ok(
  $$ select public.update_module_settings('crm', '{"x": 1}') $$,
  '42501', 'Only the super admin can change module settings.', 'staff cannot change module settings'
);
reset role;

-- Super admin: dependency rules ------------------------------------------------------------------
select tests.claims_for('c9000000-0000-4000-8000-000000000001');
set local role authenticated;

select throws_ok(
  $$ select public.set_module_enabled('email_marketing', true) $$,
  '55000', 'Email marketing requires CRM. Turn on CRM first.',
  'email marketing cannot be enabled while CRM is off'
);
select lives_ok($$ select public.set_module_enabled('crm', true) $$, 'CRM can be enabled');
select lives_ok($$ select public.set_module_enabled('email_marketing', true) $$, 'then email marketing can');
select throws_ok(
  $$ select public.set_module_enabled('crm', false) $$,
  '55000', 'CRM can''t be turned off while Email marketing is on. Turn off Email marketing first.',
  'CRM cannot be disabled while email marketing is on'
);
select lives_ok($$ select public.set_module_enabled('email_marketing', false) $$, 'email marketing can be disabled');
select lives_ok($$ select public.set_module_enabled('crm', false) $$, 'then CRM can');
select lives_ok($$ select public.set_module_enabled('crm', false) $$, 'disabling a disabled module is a no-op');
reset role;

select results_eq(
  $$ select enabled, enabled_at is not null, disabled_at is not null, enabled_by
     from public.modules where key = 'crm' $$,
  $$ values (false, true, true, 'c9000000-0000-4000-8000-000000000001'::uuid) $$,
  'set_module_enabled records enabled_at, disabled_at, and enabled_by'
);
select results_eq(
  $$ select action, scope, target_id from public.audit_log
     where actor_id = 'c9000000-0000-4000-8000-000000000001' and action like 'module.%'
     order by id $$,
  $$ values ('module.enabled', 'crm', 'crm'),
            ('module.enabled', 'email_marketing', 'email_marketing'),
            ('module.disabled', 'email_marketing', 'email_marketing'),
            ('module.disabled', 'crm', 'crm') $$,
  'each real change writes one audit entry; refusals and no-ops write none'
);

-- Super admin: module settings --------------------------------------------------------------------
select tests.claims_for('c9000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(
  public.update_module_settings('blog', '{"postsPerPage": 9, "showAuthor": true}'),
  '{"postsPerPage": 9, "showAuthor": true}'::jsonb,
  'the super admin can save settings (even while the module is off)'
);
select is(
  public.update_module_settings('blog', '{"postsPerPage": 12, "showAuthor": true}'),
  '{"postsPerPage": 12, "showAuthor": true}'::jsonb,
  'and change them'
);
select is(
  public.update_module_settings('blog', '{"postsPerPage": 12, "showAuthor": true}'),
  '{"postsPerPage": 12, "showAuthor": true}'::jsonb,
  'saving the same settings is a no-op'
);
select throws_ok(
  $$ select public.update_module_settings('blog', '[1, 2]') $$,
  '22023', 'Module settings must be a JSON object.', 'settings must be an object'
);
select throws_ok(
  $$ select public.update_module_settings('blog', null) $$,
  '22023', 'Module settings must be a JSON object.', 'settings cannot be null'
);
select throws_ok(
  $$ select public.update_module_settings('content', '{}') $$,
  'P0002', 'Unknown module "content".', 'core scopes have no module settings'
);
select throws_ok(
  $$ select public.set_module_enabled('nope', true) $$,
  'P0002', 'Unknown module "nope".', 'unknown modules are rejected'
);
select throws_ok(
  $$ update public.modules set settings = '{"x": 1}' where key = 'blog' $$,
  '42501', null, 'the super admin cannot update modules directly'
);
reset role;

select is(
  (select settings from public.modules where key = 'blog'),
  '{"postsPerPage": 12, "showAuthor": true}'::jsonb,
  'the settings are stored'
);
select results_eq(
  $$ select metadata -> 'changed' from public.audit_log
     where action = 'module.settings_updated' and target_id = 'blog' order by id $$,
  $$ values ('["postsPerPage", "showAuthor"]'::jsonb), ('["postsPerPage"]'::jsonb) $$,
  'settings audit entries list the changed keys (none for a no-op)'
);
select is(
  (select enabled from public.modules where key = 'blog'),
  false,
  'saving settings does not turn the module on'
);
select throws_ok(
  $$ update public.modules set settings = '[]' where key = 'blog' $$,
  '23514', null, 'the settings column only holds objects'
);

select * from finish();
rollback;
