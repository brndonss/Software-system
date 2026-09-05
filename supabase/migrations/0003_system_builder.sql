create table public.system_builds (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'analyzing', 'generating', 'validating', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 3),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.system_configurations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  build_id uuid not null unique references public.system_builds(id) on delete restrict,
  version integer not null check (version > 0),
  configuration jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (customer_id, version)
);

create unique index one_active_system_configuration_per_customer
on public.system_configurations(customer_id) where is_active;
create index system_builds_customer_id_idx on public.system_builds(customer_id);
create index system_configurations_customer_id_idx on public.system_configurations(customer_id);

create trigger system_builds_set_updated_at before update on public.system_builds for each row execute function public.set_updated_at();

alter table public.system_builds enable row level security;
alter table public.system_configurations enable row level security;

create policy "Owners can read their builds" on public.system_builds for select to authenticated using ((select public.is_customer_owner(customer_id)));
create policy "Owners can create their builds" on public.system_builds for insert to authenticated with check ((select public.is_customer_owner(customer_id)) and requested_by = (select auth.uid()));
create policy "Owners can read their configurations" on public.system_configurations for select to authenticated using ((select public.is_customer_owner(customer_id)));

create or replace function public.next_system_configuration_version(target_customer_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(max(version), 0) + 1 from public.system_configurations where customer_id = target_customer_id;
$$;
