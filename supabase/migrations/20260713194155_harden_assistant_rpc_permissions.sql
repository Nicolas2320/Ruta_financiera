-- Keep privileged routines deterministic and independent from caller-controlled schemas.
alter function public.consume_assistant_daily_question(uuid, date, integer)
  set search_path = '';

alter function public.set_updated_at()
  set search_path = '';

-- The assistant quota RPC is server-only. The Edge Function invokes it with
-- the service role after validating the user's access token.
revoke all privileges on function public.consume_assistant_daily_question(uuid, date, integer)
  from public, anon, authenticated;
grant execute on function public.consume_assistant_daily_question(uuid, date, integer)
  to service_role;

-- Existing tables keep only the Data API privileges required by the app.
revoke all privileges on table public.financial_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.financial_profiles to authenticated;
grant all privileges on table public.financial_profiles to service_role;

revoke all privileges on table public.assistant_daily_usage from public, anon, authenticated;
grant select on table public.assistant_daily_usage to authenticated;
grant all privileges on table public.assistant_daily_usage to service_role;

-- New public objects must opt in to Data API exposure in their own migration.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on functions from public, anon, authenticated;
