-- Module framework (Phase 5): module settings and timestamps, hard dependencies between modules,
-- dependency-aware set_module_enabled, and update_module_settings.
--
-- The app's module registry (src/core/modules) mirrors module_dependencies; a test keeps them in
-- sync. Integration requirements (Stripe, Resend, Mux) are checked in the app because the keys
-- live in environment variables.

-- ---------------------------------------------------------------------------------------------
-- modules: settings and on/off history
-- ---------------------------------------------------------------------------------------------

alter table public.modules
  add column settings jsonb not null default '{}'::jsonb
    constraint modules_settings_is_object check (jsonb_typeof(settings) = 'object'),
  add column enabled_at timestamptz,
  add column disabled_at timestamptz,
  add column enabled_by uuid references public.profiles (id) on delete set null;

comment on column public.modules.settings is
  'Module settings, validated by the manifest''s Zod schema in the app. Never put secrets here.';

-- Modules change only through set_module_enabled and update_module_settings, which enforce the
-- dependency rules and write audit entries. Nobody updates the table directly.
drop policy "Super admin can update modules" on public.modules;
revoke update on public.modules from authenticated;

-- Visitors need the on/off state and settings, not who changed them.
revoke select on public.modules from anon;
grant select (key, enabled, settings) on public.modules to anon;

-- ---------------------------------------------------------------------------------------------
-- module_dependencies: module_key cannot be enabled unless requires_key is enabled
-- ---------------------------------------------------------------------------------------------

create table public.module_dependencies (
  module_key text not null references public.modules (key),
  requires_key text not null references public.modules (key),
  primary key (module_key, requires_key),
  constraint module_dependencies_not_self check (module_key <> requires_key)
);

comment on table public.module_dependencies is
  'Hard dependencies between modules (mirrors requiresModules in the manifests). Migrations only.';

create index module_dependencies_requires_key_idx on public.module_dependencies (requires_key);

insert into public.module_dependencies (module_key, requires_key) values
  ('email_marketing', 'crm');

alter table public.module_dependencies enable row level security;

create policy "Signed-in users can read module dependencies"
  on public.module_dependencies for select
  to authenticated
  using (true);

revoke insert, update, delete, truncate, references, trigger on public.module_dependencies
  from anon, authenticated;
revoke select on public.module_dependencies from anon;

-- ---------------------------------------------------------------------------------------------
-- set_module_enabled: now refuses to break dependencies and records who/when
-- ---------------------------------------------------------------------------------------------

create or replace function public.set_module_enabled(module_key text, enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_enabled boolean;
  module_label text;
  blocking text;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can enable or disable modules.'
      using errcode = '42501';
  end if;

  if set_module_enabled.enabled is null then
    raise exception 'enabled must be true or false.'
      using errcode = '22023';
  end if;

  -- Lock every module row so two concurrent changes can't break a dependency between them.
  perform 1 from public.modules for update;

  select m.enabled, s.label into was_enabled, module_label
  from public.modules m
  join public.permission_scopes s on s.key = m.key
  where m.key = set_module_enabled.module_key;

  if not found then
    raise exception 'Unknown module "%".', set_module_enabled.module_key
      using errcode = 'P0002';
  end if;

  if was_enabled = set_module_enabled.enabled then
    return;
  end if;

  if set_module_enabled.enabled then
    select string_agg(s.label, ', ' order by s.sort_order) into blocking
    from public.module_dependencies d
    join public.modules r on r.key = d.requires_key
    join public.permission_scopes s on s.key = d.requires_key
    where d.module_key = set_module_enabled.module_key
      and not r.enabled;

    if blocking is not null then
      raise exception '% requires %. Turn on % first.', module_label, blocking, blocking
        using errcode = 'P0001';
    end if;
  else
    select string_agg(s.label, ', ' order by s.sort_order) into blocking
    from public.module_dependencies d
    join public.modules dep on dep.key = d.module_key
    join public.permission_scopes s on s.key = d.module_key
    where d.requires_key = set_module_enabled.module_key
      and dep.enabled;

    if blocking is not null then
      raise exception '% can''t be turned off while % is on. Turn off % first.',
        module_label, blocking, blocking
        using errcode = 'P0001';
    end if;
  end if;

  update public.modules m
  set enabled = set_module_enabled.enabled,
      enabled_at = case when set_module_enabled.enabled then now() else m.enabled_at end,
      enabled_by = case when set_module_enabled.enabled then auth.uid() else m.enabled_by end,
      disabled_at = case when set_module_enabled.enabled then m.disabled_at else now() end,
      updated_by = auth.uid()
  where m.key = set_module_enabled.module_key;

  perform public.log_audit(
    case when set_module_enabled.enabled then 'module.enabled' else 'module.disabled' end,
    set_module_enabled.module_key,
    'modules',
    set_module_enabled.module_key,
    '{}'::jsonb
  );
end;
$$;

comment on function public.set_module_enabled(text, boolean) is
  'Super admin turns a module on or off. Refuses to break module_dependencies; never deletes data.';

revoke execute on function public.set_module_enabled(text, boolean) from public, anon;
grant execute on function public.set_module_enabled(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- update_module_settings: super admin replaces a module's settings (validated in the app)
-- ---------------------------------------------------------------------------------------------

create function public.update_module_settings(module_key text, settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  changed text[];
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can change module settings.'
      using errcode = '42501';
  end if;

  if update_module_settings.settings is null
    or jsonb_typeof(update_module_settings.settings) <> 'object' then
    raise exception 'Module settings must be a JSON object.'
      using errcode = '22023';
  end if;

  select m.settings into previous
  from public.modules m
  where m.key = update_module_settings.module_key
  for update;

  if not found then
    raise exception 'Unknown module "%".', update_module_settings.module_key
      using errcode = 'P0002';
  end if;

  select coalesce(array_agg(k order by k), '{}') into changed
  from (
    select jsonb_object_keys(previous) as k
    union
    select jsonb_object_keys(update_module_settings.settings)
  ) keys
  where previous -> k is distinct from update_module_settings.settings -> k;

  if cardinality(changed) = 0 then
    return previous;
  end if;

  update public.modules m
  set settings = update_module_settings.settings,
      updated_by = auth.uid()
  where m.key = update_module_settings.module_key;

  perform public.log_audit(
    'module.settings_updated',
    update_module_settings.module_key,
    'modules',
    update_module_settings.module_key,
    jsonb_build_object('changed', to_jsonb(changed))
  );

  return update_module_settings.settings;
end;
$$;

comment on function public.update_module_settings(text, jsonb) is
  'Super admin replaces a module''s settings; audits the changed keys. Allowed while disabled.';

revoke execute on function public.update_module_settings(text, jsonb) from public, anon;
grant execute on function public.update_module_settings(text, jsonb) to authenticated;
