-- Phase 3C: durable provisioning state only.
-- No worker execution, claiming, provisioning, or activation is implemented here.

alter table public.workspace_deployments
  drop constraint if exists workspace_deployments_state_check;

alter table public.workspace_deployments
  add column if not exists blueprint_schema_version integer not null default 1 check (blueprint_schema_version > 0),
  add column if not exists runtime_schema_version integer not null default 1 check (runtime_schema_version > 0),
  add column if not exists capability_registry_version text not null default '1',
  add column if not exists idempotency_key text,
  add column if not exists requested_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists ready_at timestamptz;

alter table public.workspace_deployments
  add constraint workspace_deployments_state_check
  check (state in ('draft', 'queued', 'provisioning', 'ready', 'failed', 'archived'));

create unique index if not exists workspace_deployments_idempotency_key_idx
  on public.workspace_deployments(workspace_id, idempotency_key)
  where idempotency_key is not null;

create trigger workspace_deployments_set_updated_at
before update on public.workspace_deployments
for each row execute function public.set_updated_at();

create or replace function public.guard_workspace_deployment_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.state <> new.state and not (
    (old.state = 'draft' and new.state = 'queued')
    or (old.state = 'queued' and new.state = 'provisioning')
    or (old.state = 'provisioning' and new.state in ('ready', 'failed'))
    or (old.state = 'failed' and new.state = 'queued')
    or (old.state = 'ready' and new.state = 'archived')
    or (old.state = 'draft' and new.state = 'archived')
  ) then
    raise exception 'invalid deployment state transition: % to %', old.state, new.state using errcode = 'P0010';
  end if;

  if old.state <> 'draft' and (
    new.workspace_id is distinct from old.workspace_id
    or new.customer_id is distinct from old.customer_id
    or new.workspace_blueprint_id is distinct from old.workspace_blueprint_id
    or new.blueprint_version is distinct from old.blueprint_version
    or new.compiler_version is distinct from old.compiler_version
    or new.blueprint_schema_version is distinct from old.blueprint_schema_version
    or new.runtime_schema_version is distinct from old.runtime_schema_version
    or new.capability_registry_version is distinct from old.capability_registry_version
    or new.blueprint_hash is distinct from old.blueprint_hash
    or new.compiled_workspace_hash is distinct from old.compiled_workspace_hash
    or new.provisioning_plan_hash is distinct from old.provisioning_plan_hash
    or new.idempotency_key is distinct from old.idempotency_key
    or new.compiled_workspace is distinct from old.compiled_workspace
    or new.provisioning_plan is distinct from old.provisioning_plan
    or new.created_by is distinct from old.created_by
  ) then
    raise exception 'queued deployment artifacts are immutable' using errcode = 'P0011';
  end if;

  return new;
end;
$$;

create trigger workspace_deployments_guard_transition
before update on public.workspace_deployments
for each row execute function public.guard_workspace_deployment_transition();

create table public.provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  idempotency_key text not null,
  state text not null default 'queued' check (state in ('queued', 'running', 'retry_wait', 'succeeded', 'failed', 'cancelled', 'dead_letter')),
  requested_by uuid references auth.users(id) on delete set null,
  priority integer not null default 0,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id)
    references public.workspace_deployments(id, workspace_id, customer_id)
    on delete cascade,
  unique (workspace_id, idempotency_key),
  unique (id, deployment_id, workspace_id, customer_id)
);

create index provisioning_jobs_claim_idx
  on public.provisioning_jobs(state, available_at, priority desc, created_at);
create index provisioning_jobs_workspace_idx
  on public.provisioning_jobs(workspace_id, created_at desc);

create trigger provisioning_jobs_set_updated_at
before update on public.provisioning_jobs
for each row execute function public.set_updated_at();

create or replace function public.guard_provisioning_job_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.state <> new.state and not (
    (old.state = 'queued' and new.state in ('running', 'cancelled'))
    or (old.state = 'running' and new.state in ('retry_wait', 'succeeded', 'failed', 'cancelled'))
    or (old.state = 'retry_wait' and new.state in ('running', 'cancelled'))
    or (old.state = 'failed' and new.state = 'dead_letter')
  ) then
    raise exception 'invalid provisioning job state transition: % to %', old.state, new.state using errcode = 'P0020';
  end if;
  return new;
end;
$$;

create trigger provisioning_jobs_guard_transition
before update on public.provisioning_jobs
for each row execute function public.guard_provisioning_job_transition();

create table public.provisioning_operations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  job_id uuid not null,
  operation_id text not null check (char_length(trim(operation_id)) between 1 and 300),
  kind text not null check (char_length(trim(kind)) between 1 and 100),
  target_key text not null check (char_length(trim(target_key)) between 1 and 300),
  payload jsonb not null default '{}'::jsonb,
  depends_on jsonb not null default '[]'::jsonb,
  state text not null default 'pending' check (state in ('pending', 'running', 'retry_wait', 'succeeded', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  result jsonb,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (job_id, deployment_id, workspace_id, customer_id)
    references public.provisioning_jobs(id, deployment_id, workspace_id, customer_id)
    on delete cascade,
  foreign key (deployment_id, workspace_id, customer_id)
    references public.workspace_deployments(id, workspace_id, customer_id)
    on delete cascade,
  unique (job_id, operation_id),
  unique (id, job_id, deployment_id, workspace_id, customer_id)
);

create index provisioning_operations_claim_idx
  on public.provisioning_operations(state, available_at, created_at);
create index provisioning_operations_job_idx
  on public.provisioning_operations(job_id, state, created_at);

create trigger provisioning_operations_set_updated_at
before update on public.provisioning_operations
for each row execute function public.set_updated_at();

create or replace function public.guard_provisioning_operation_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.state <> new.state and not (
    (old.state = 'pending' and new.state in ('running', 'skipped'))
    or (old.state = 'running' and new.state in ('retry_wait', 'succeeded', 'failed'))
    or (old.state = 'retry_wait' and new.state = 'running')
  ) then
    raise exception 'invalid provisioning operation state transition: % to %', old.state, new.state using errcode = 'P0021';
  end if;
  return new;
end;
$$;

create trigger provisioning_operations_guard_transition
before update on public.provisioning_operations
for each row execute function public.guard_provisioning_operation_transition();

create table public.provisioning_attempts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  job_id uuid not null,
  operation_id uuid,
  attempt_number integer not null check (attempt_number > 0),
  worker_identity text not null check (char_length(trim(worker_identity)) between 1 and 200),
  started_at timestamptz not null,
  finished_at timestamptz,
  outcome text not null check (outcome in ('succeeded', 'retry_wait', 'failed', 'cancelled')),
  error_code text,
  error_message text,
  details jsonb not null default '{}'::jsonb,
  foreign key (job_id, deployment_id, workspace_id, customer_id)
    references public.provisioning_jobs(id, deployment_id, workspace_id, customer_id)
    on delete cascade,
  foreign key (operation_id, job_id, deployment_id, workspace_id, customer_id)
    references public.provisioning_operations(id, job_id, deployment_id, workspace_id, customer_id)
    on delete cascade
);

create unique index provisioning_attempts_job_number_idx
  on public.provisioning_attempts(job_id, attempt_number)
  where operation_id is null;
create unique index provisioning_attempts_operation_number_idx
  on public.provisioning_attempts(operation_id, attempt_number)
  where operation_id is not null;
create index provisioning_attempts_job_idx on public.provisioning_attempts(job_id, started_at desc);

create table public.runtime_operation_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  job_id uuid,
  operation_id uuid,
  operation_type text not null check (char_length(trim(operation_type)) between 1 and 120),
  actor text not null check (char_length(trim(actor)) between 1 and 200),
  request_metadata jsonb not null default '{}'::jsonb,
  result_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (job_id, deployment_id, workspace_id, customer_id)
    references public.provisioning_jobs(id, deployment_id, workspace_id, customer_id)
    on delete restrict,
  foreign key (operation_id, job_id, deployment_id, workspace_id, customer_id)
    references public.provisioning_operations(id, job_id, deployment_id, workspace_id, customer_id)
    on delete restrict,
  foreign key (deployment_id, workspace_id, customer_id)
    references public.workspace_deployments(id, workspace_id, customer_id)
    on delete cascade
);

create index runtime_operation_log_workspace_idx
  on public.runtime_operation_log(workspace_id, deployment_id, created_at desc);
create index runtime_operation_log_job_idx
  on public.runtime_operation_log(job_id, created_at desc);

alter table public.provisioning_jobs enable row level security;
alter table public.provisioning_operations enable row level security;
alter table public.provisioning_attempts enable row level security;
alter table public.runtime_operation_log enable row level security;

-- Intentionally no authenticated policies: Phase 3C state is not client-writable or client-readable.
