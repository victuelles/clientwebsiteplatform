-- Baseline: enable the Postgres extensions the platform relies on. No tables yet.
--
-- pgcrypto: gen_random_bytes(), crypt(), digest() for tokens and hashing.
-- citext:   case-insensitive text, used for email columns.
--
-- Supabase keeps extensions in the `extensions` schema, which is on the default search_path.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
