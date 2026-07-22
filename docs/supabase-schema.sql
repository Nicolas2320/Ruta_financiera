-- LEGACY REFERENCE ONLY.
-- The source of truth for the database schema is now supabase/migrations/.
-- Do not run this file against the linked project; use versioned migrations.

create table if not exists public.financial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding jsonb not null default '{}'::jsonb,
  completed_actions jsonb not null default '{}'::jsonb,
  exact_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_profiles
add column if not exists exact_values jsonb not null default '{}'::jsonb;

alter table public.financial_profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_financial_profiles_updated_at on public.financial_profiles;

create trigger set_financial_profiles_updated_at
before update on public.financial_profiles
for each row
execute function public.set_updated_at();

drop policy if exists "Users can read own financial profile" on public.financial_profiles;
drop policy if exists "Users can insert own financial profile" on public.financial_profiles;
drop policy if exists "Users can update own financial profile" on public.financial_profiles;
drop policy if exists "Users can delete own financial profile" on public.financial_profiles;

create policy "Users can read own financial profile"
on public.financial_profiles
for select
using (auth.uid() = user_id);

create policy "Users can insert own financial profile"
on public.financial_profiles
for insert
with check (auth.uid() = user_id);

create policy "Users can update own financial profile"
on public.financial_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own financial profile"
on public.financial_profiles
for delete
using (auth.uid() = user_id);

create table if not exists public.assistant_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  question_count integer not null default 0 check (question_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.assistant_daily_usage enable row level security;

drop trigger if exists set_assistant_daily_usage_updated_at on public.assistant_daily_usage;

create trigger set_assistant_daily_usage_updated_at
before update on public.assistant_daily_usage
for each row
execute function public.set_updated_at();

drop policy if exists "Users can read own assistant usage" on public.assistant_daily_usage;

create policy "Users can read own assistant usage"
on public.assistant_daily_usage
for select
using (auth.uid() = user_id);

create or replace function public.consume_assistant_daily_question(
  p_user_id uuid,
  p_usage_date date,
  p_daily_limit integer
)
returns table (
  allowed boolean,
  question_count integer,
  remaining_questions integer,
  daily_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  consumed_count integer;
begin
  if p_daily_limit < 1 then
    raise exception 'Daily limit must be greater than zero';
  end if;

  insert into public.assistant_daily_usage (user_id, usage_date, question_count)
  values (p_user_id, p_usage_date, 1)
  on conflict (user_id, usage_date)
  do update
    set question_count = public.assistant_daily_usage.question_count + 1
    where public.assistant_daily_usage.question_count < p_daily_limit
  returning public.assistant_daily_usage.question_count into consumed_count;

  if consumed_count is null then
    select public.assistant_daily_usage.question_count
      into consumed_count
    from public.assistant_daily_usage
    where user_id = p_user_id
      and usage_date = p_usage_date;

    return query
    select
      false,
      coalesce(consumed_count, 0),
      0,
      p_daily_limit;

    return;
  end if;

  return query
  select
    true,
    consumed_count,
    greatest(p_daily_limit - consumed_count, 0),
    p_daily_limit;
end;
$$;

revoke all on function public.consume_assistant_daily_question(uuid, date, integer) from public;
grant execute on function public.consume_assistant_daily_question(uuid, date, integer) to service_role;
