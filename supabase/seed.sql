-- LOCAL DEVELOPMENT ONLY. Runs on `pnpm db:reset` against the local Supabase database.
-- NEVER run this file against a client database.
--
-- Test accounts (all passwords: Password123!)
--   superadmin@example.test  super_admin
--   staff@example.test       staff with content:view and content:edit
--   user@example.test        user

do $$
declare
  seed record;
begin
  for seed in
    select * from (values
      ('00000000-0000-4000-8000-000000000001'::uuid, 'superadmin@example.test', 'Sam Super'),
      ('00000000-0000-4000-8000-000000000002'::uuid, 'staff@example.test', 'Stacy Staff'),
      ('00000000-0000-4000-8000-000000000003'::uuid, 'user@example.test', 'Uma User')
    ) as t (id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', seed.id, 'authenticated', 'authenticated',
      seed.email, extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', seed.full_name), now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      seed.id::text, seed.id,
      jsonb_build_object('sub', seed.id::text, 'email', seed.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

-- The auth trigger created each profile with role 'user'.
update public.profiles set role = 'super_admin' where email = 'superadmin@example.test';
update public.profiles set role = 'staff' where email = 'staff@example.test';

insert into public.staff_permissions (user_id, scope, action, granted_by)
select staff.id, 'content', action, admin.id
from public.profiles staff
cross join public.profiles admin
cross join unnest(array['view', 'edit']::public.permission_action[]) as action
where staff.email = 'staff@example.test'
  and admin.email = 'superadmin@example.test';
