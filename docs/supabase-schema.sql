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
