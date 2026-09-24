-- Phase 3D: narrow trusted worker claim and completion functions.
-- Execute only from a trusted server-side worker using the service role.

create or replace function public.claim_provisioning_job(
  p_worker_identity text,
  p_lease_seconds integer default 300
)
returns public.provisioning_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_job public.provisioning_jobs;
begin
  if nullif(trim(p_worker_identity), '') is null or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'invalid worker lease request' using errcode = 'P0030';
  end if;

  select job.* into selected_job
  from public.provisioning_jobs as job
  where (
    job.state in ('queued', 'retry_wait')
    and job.available_at <= now()
  ) or (
    job.state = 'running'
    and job.lease_expires_at is not null
    and job.lease_expires_at <= now()
  )
  order by job.priority desc, job.created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.provisioning_jobs
  set state = 'running',
      attempt_count = attempt_count + 1,
      lease_owner = p_worker_identity,
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = selected_job.id
  returning * into selected_job;

  update public.workspace_deployments
  set state = case when state = 'queued' then 'provisioning' else state end,
      updated_at = now()
  where id = selected_job.deployment_id
    and workspace_id = selected_job.workspace_id
    and customer_id = selected_job.customer_id;

  return selected_job;
end;
$$;

grant execute on function public.claim_provisioning_job(text, integer) to service_role;

create or replace function public.heartbeat_provisioning_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lease_seconds < 30 or p_lease_seconds > 3600 then raise exception 'invalid lease duration' using errcode = 'P0031'; end if;
  update public.provisioning_jobs
  set lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  where id = p_job_id and state = 'running' and lease_token = p_lease_token and lease_expires_at > now();
  return found;
end;
$$;

grant execute on function public.heartbeat_provisioning_job(uuid, uuid, integer) to service_role;

create or replace function public.claim_provisioning_operation(
  p_job_id uuid,
  p_job_lease_token uuid,
  p_worker_identity text,
  p_lease_seconds integer default 300
)
returns public.provisioning_operations
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_operation public.provisioning_operations;
begin
  if p_lease_seconds < 30 or p_lease_seconds > 3600 then raise exception 'invalid lease duration' using errcode = 'P0031'; end if;
  if not exists (select 1 from public.provisioning_jobs where id = p_job_id and state = 'running' and lease_token = p_job_lease_token and lease_expires_at > now()) then
    raise exception 'job lease is not valid' using errcode = 'P0032';
  end if;

  select operation.* into selected_operation
  from public.provisioning_operations as operation
  where operation.job_id = p_job_id
    and (
      (operation.state = 'pending')
      or (operation.state = 'retry_wait' and operation.available_at <= now())
      or (operation.state = 'running' and operation.lease_expires_at is not null and operation.lease_expires_at <= now())
    )
    and not exists (
      select 1
      from jsonb_array_elements_text(operation.depends_on) as dependency(operation_id)
      where not exists (
        select 1 from public.provisioning_operations as completed
        where completed.job_id = operation.job_id
          and completed.operation_id = dependency.operation_id
          and completed.state = 'succeeded'
      )
    )
  order by operation.created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.provisioning_operations
  set state = 'running',
      attempt_count = attempt_count + 1,
      lease_owner = p_worker_identity,
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = selected_operation.id
  returning * into selected_operation;

  return selected_operation;
end;
$$;

grant execute on function public.claim_provisioning_operation(uuid, uuid, text, integer) to service_role;

create or replace function public.heartbeat_provisioning_operation(
  p_operation_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.provisioning_operations
  set lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  where id = p_operation_id and state = 'running' and lease_token = p_lease_token and lease_expires_at > now();
  return found;
end;
$$;

grant execute on function public.heartbeat_provisioning_operation(uuid, uuid, integer) to service_role;

create or replace function public.complete_provisioning_operation(
  p_operation_id uuid,
  p_lease_token uuid,
  p_result jsonb default '{}'::jsonb
)
returns public.provisioning_operations
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_operation public.provisioning_operations;
begin
  update public.provisioning_operations
  set state = 'succeeded', result = p_result, completed_at = now(), lease_owner = null, lease_token = null, lease_expires_at = null, updated_at = now()
  where id = p_operation_id and state = 'running' and lease_token = p_lease_token and lease_expires_at > now()
  returning * into completed_operation;
  if not found then raise exception 'operation lease is not valid' using errcode = 'P0033'; end if;
  return completed_operation;
end;
$$;

grant execute on function public.complete_provisioning_operation(uuid, uuid, jsonb) to service_role;

create or replace function public.fail_provisioning_operation(
  p_operation_id uuid,
  p_lease_token uuid,
  p_retryable boolean,
  p_error_code text,
  p_error_message text,
  p_backoff_seconds integer default 60
)
returns public.provisioning_operations
language plpgsql
security definer
set search_path = public
as $$
declare
  failed_operation public.provisioning_operations;
  next_state text;
begin
  select case when p_retryable and attempt_count < max_attempts then 'retry_wait' else 'failed' end into next_state
  from public.provisioning_operations where id = p_operation_id and state = 'running' and lease_token = p_lease_token and lease_expires_at > now();
  if not found then raise exception 'operation lease is not valid' using errcode = 'P0033'; end if;

  update public.provisioning_operations
  set state = next_state,
      available_at = case when next_state = 'retry_wait' then now() + make_interval(secs => greatest(p_backoff_seconds, 1)) else available_at end,
      last_error_code = left(p_error_code, 120),
      last_error_message = left(p_error_message, 1000),
      completed_at = case when next_state = 'failed' then now() else null end,
      lease_owner = null, lease_token = null, lease_expires_at = null, updated_at = now()
  where id = p_operation_id
  returning * into failed_operation;
  return failed_operation;
end;
$$;

grant execute on function public.fail_provisioning_operation(uuid, uuid, boolean, text, text, integer) to service_role;

create or replace function public.complete_provisioning_job(
  p_job_id uuid,
  p_lease_token uuid
)
returns public.provisioning_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_job public.provisioning_jobs;
begin
  if exists (select 1 from public.provisioning_operations where job_id = p_job_id and state <> 'succeeded') then
    raise exception 'provisioning operations are not complete' using errcode = 'P0034';
  end if;

  update public.provisioning_jobs
  set state = 'succeeded', completed_at = now(), lease_owner = null, lease_token = null, lease_expires_at = null, updated_at = now()
  where id = p_job_id and state = 'running' and lease_token = p_lease_token and lease_expires_at > now()
  returning * into completed_job;
  if not found then raise exception 'job lease is not valid' using errcode = 'P0035'; end if;

  update public.workspace_deployments as deployment
  set state = 'ready', ready_at = now(), updated_at = now()
  where deployment.id = completed_job.deployment_id
    and deployment.workspace_id = completed_job.workspace_id
    and deployment.customer_id = completed_job.customer_id
    and deployment.state = 'provisioning';

  return completed_job;
end;
$$;

grant execute on function public.complete_provisioning_job(uuid, uuid) to service_role;

create or replace function public.fail_provisioning_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_retryable boolean,
  p_error_code text,
  p_error_message text,
  p_backoff_seconds integer default 60
)
returns public.provisioning_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  failed_job public.provisioning_jobs;
  next_state text;
begin
  select case when p_retryable and attempt_count < max_attempts then 'retry_wait' else 'failed' end
  into next_state
  from public.provisioning_jobs
  where id = p_job_id and state = 'running' and lease_token = p_lease_token and lease_expires_at > now();
  if not found then raise exception 'job lease is not valid' using errcode = 'P0035'; end if;

  update public.provisioning_jobs
  set state = next_state,
      available_at = case when next_state = 'retry_wait' then now() + make_interval(secs => greatest(p_backoff_seconds, 1)) else available_at end,
      last_error_code = left(p_error_code, 120),
      last_error_message = left(p_error_message, 1000),
      completed_at = case when next_state = 'failed' then now() else null end,
      lease_owner = null, lease_token = null, lease_expires_at = null, updated_at = now()
  where id = p_job_id
  returning * into failed_job;

  if next_state = 'failed' then
    update public.workspace_deployments
    set state = 'failed', error_code = left(p_error_code, 120), error_message = left(p_error_message, 1000), updated_at = now()
    where id = failed_job.deployment_id and workspace_id = failed_job.workspace_id and customer_id = failed_job.customer_id and state = 'provisioning';
  end if;
  return failed_job;
end;
$$;

grant execute on function public.fail_provisioning_job(uuid, uuid, boolean, text, text, integer) to service_role;
