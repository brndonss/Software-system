create extension if not exists pgcrypto;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(trim(business_name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  role text not null default 'owner' check (role = 'owner'),
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_profiles_customer_id_idx on public.user_profiles(customer_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.user_profiles enable row level security;

create policy "Users can read their customer"
on public.customers for select to authenticated
using (id = (select customer_id from public.user_profiles where id = (select auth.uid())));

create policy "Owners can update their customer"
on public.customers for update to authenticated
using (id = (select customer_id from public.user_profiles where id = (select auth.uid()) and role = 'owner'))
with check (id = (select customer_id from public.user_profiles where id = (select auth.uid()) and role = 'owner'));

create policy "Users can read their profile"
on public.user_profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Owners can read customer profiles"
on public.user_profiles for select to authenticated
using (customer_id = (select customer_id from public.user_profiles where id = (select auth.uid()) and role = 'owner'));

create policy "Users can update their profile"
on public.user_profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
