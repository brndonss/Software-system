-- Phase 3C retry support: requeue one failed provisioning job in place.
-- The deployment, provisioning operations, and idempotency keys are preserved.

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
    or (old.state = 'failed' and new.state in ('queued', 'dead_letter'))
  ) then
    raise exception 'invalid provisioning job state transition: % to %', old.state, new.state using errcode = 'P0020';
  end if;
  return new;
end;
$$;

create or replace function public.retry_provisioning_job(
  p_job_id uuid,
  p_actor_user_id uuid
)
returns public.provisioning_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job_row public.provisioning_jobs;
  deployment_row public.workspace_deployments;
begin
  if p_actor_user_id is null then
    raise exception 'authenticated actor is required' using errcode = '42501';
  end if;

  select job.* into job_row
  from public.provisioning_jobs as job
  join public.user_profiles as profile
    on profile.id = p_actor_user_id
   and profile.customer_id = job.customer_id
   and profile.role = 'owner'
  where job.id = p_job_id
  for update;

  if not found then
    raise exception 'provisioning job not found or actor is not the workspace owner' using errcode = '42501';
  end if;
  if job_row.state <> 'failed' then
    raise exception 'only failed provisioning jobs can be retried' using errcode = 'P0036';
  end if;

  select deployment.* into deployment_row
  from public.workspace_deployments as deployment
  where deployment.id = job_row.deployment_id
    and deployment.workspace_id = job_row.workspace_id
    and deployment.customer_id = job_row.customer_id
  for update;

  if not found then
    raise exception 'provisioning deployment not found' using errcode = 'P0037';
  end if;
  if deployment_row.state <> 'failed' then
    raise exception 'only failed deployments can be retried' using errcode = 'P0038';
  end if;

  update public.provisioning_operations
  set state = 'pending',
      available_at = now(),
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = null,
      last_error_message = null,
      result = null,
      started_at = null,
      completed_at = null,
      updated_at = now()
  where job_id = job_row.id
    and deployment_id = job_row.deployment_id
    and workspace_id = job_row.workspace_id
    and customer_id = job_row.customer_id
    and state <> 'succeeded';

  update public.provisioning_jobs
  set state = 'queued',
      available_at = now(),
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = null,
      last_error_message = null,
      completed_at = null,
      updated_at = now()
  where id = job_row.id
  returning * into job_row;

  update public.workspace_deployments
  set state = 'queued',
      error_code = null,
      error_message = null,
      updated_at = now()
  where id = deployment_row.id
    and workspace_id = deployment_row.workspace_id
    and customer_id = deployment_row.customer_id;

  insert into public.runtime_operation_log (
    customer_id,
    workspace_id,
    deployment_id,
    job_id,
    operation_type,
    actor,
    request_metadata,
    result_metadata,
    created_at
  ) values (
    job_row.customer_id,
    job_row.workspace_id,
    job_row.deployment_id,
    job_row.id,
    'provisioning_retry',
    p_actor_user_id::text,
    jsonb_build_object('previousState', 'failed', 'idempotencyKey', job_row.idempotency_key),
    jsonb_build_object('state', 'queued'),
    now()
  );

  return job_row;
end;
$$;

grant execute on function public.retry_provisioning_job(uuid, uuid) to service_role;
