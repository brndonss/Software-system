create table public.customer_onboarding (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  business_niche text not null check (char_length(trim(business_niche)) between 1 and 200),
  business_size text not null check (business_size in ('solo', '2-10', '11-50', '51-200', '201+')),
  services_products text not null check (char_length(trim(services_products)) between 1 and 5000),
  current_software_tools text,
  biggest_business_struggles text,
  repetitive_tasks text,
  desired_automations text,
  software_goals text,
  additional_information text,
  status text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_onboarding_customer_id_idx on public.customer_onboarding(customer_id);

create trigger customer_onboarding_set_updated_at
before update on public.customer_onboarding
for each row execute function public.set_updated_at();

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from public.user_profiles where id = (select auth.uid()) limit 1;
$$;

create or replace function public.is_customer_owner(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = (select auth.uid())
      and customer_id = target_customer_id
      and role = 'owner'
  );
$$;

drop policy if exists "Users can read their customer" on public.customers;
drop policy if exists "Owners can update their customer" on public.customers;
drop policy if exists "Users can read their profile" on public.user_profiles;
drop policy if exists "Owners can read customer profiles" on public.user_profiles;
drop policy if exists "Users can update their profile" on public.user_profiles;

create policy "Users can read their customer"
on public.customers for select to authenticated
using (id = (select public.current_customer_id()));

create policy "Owners can update their customer"
on public.customers for update to authenticated
using ((select public.is_customer_owner(id)))
with check ((select public.is_customer_owner(id)));

create policy "Users can read their profile"
on public.user_profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Owners can read customer profiles"
on public.user_profiles for select to authenticated
using ((select public.is_customer_owner(customer_id)));

create policy "Users can update their profile"
on public.user_profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter table public.customer_onboarding enable row level security;

create policy "Users can read their onboarding"
on public.customer_onboarding for select to authenticated
using (customer_id = (select public.current_customer_id()));

create policy "Owners can create their onboarding"
on public.customer_onboarding for insert to authenticated
with check ((select public.is_customer_owner(customer_id)));

create policy "Owners can update their onboarding"
on public.customer_onboarding for update to authenticated
using ((select public.is_customer_owner(customer_id)))
with check ((select public.is_customer_owner(customer_id)));
