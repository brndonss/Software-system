-- Phase 3F: atomic deployment-pointer activation only.
-- Activation does not execute provisioning or change deployment state to active.

create or replace function public.activate_workspace_deployment(
  p_deployment_id uuid,
  p_actor_user_id uuid
)
returns table (
  workspace_id uuid,
  customer_id uuid,
  deployment_id uuid,
  previous_deployment_id uuid,
  activated_at timestamptz,
  idempotent boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.workspace_deployments;
  blueprint_row public.workspace_blueprints;
  job_count integer;
  operation_count integer;
  complete_operation_count integer;
  previous_id uuid;
  activation_time timestamptz := now();
begin
  if p_actor_user_id is null then
    raise exception 'authenticated actor is required' using errcode = 'P0040';
  end if;

  select d.* into target
  from public.workspace_deployments as d
  join public.user_profiles as profile
    on profile.customer_id = d.customer_id
   and profile.id = p_actor_user_id
   and profile.role = 'owner'
  where d.id = p_deployment_id
  for update;

  if not found then
    raise exception 'deployment not found or actor is not the workspace owner' using errcode = '42501';
  end if;

  perform 1 from public.workspaces where id = target.workspace_id and customer_id = target.customer_id for update;
  if not found then raise exception 'workspace not found' using errcode = 'P0041'; end if;

  select * into blueprint_row
  from public.workspace_blueprints
  where id = target.workspace_blueprint_id
    and workspace_id = target.workspace_id
    and customer_id = target.customer_id
  for update;
  if not found then raise exception 'deployment blueprint not found' using errcode = 'P0042'; end if;
  if blueprint_row.status <> 'approved' then raise exception 'blueprint is not approved' using errcode = 'P0043'; end if;
  if blueprint_row.validation_status <> 'valid' then raise exception 'blueprint validation is invalid' using errcode = 'P0044'; end if;
  if target.state <> 'ready' then raise exception 'deployment is not ready' using errcode = 'P0045'; end if;
  if target.archived_at is not null then raise exception 'deployment is archived' using errcode = 'P0046'; end if;
  if target.blueprint_schema_version <> 1 or target.runtime_schema_version <> 1 or target.compiler_version <> 1 or target.capability_registry_version <> '1' then
    raise exception 'deployment compatibility is unsupported' using errcode = 'P0047';
  end if;

  select count(*) into job_count
  from public.provisioning_jobs
  where deployment_id = target.id and workspace_id = target.workspace_id and customer_id = target.customer_id and state = 'succeeded';
  if job_count <> 1 then raise exception 'provisioning job is not complete' using errcode = 'P0048'; end if;

  select count(*) into operation_count
  from public.provisioning_operations
  where deployment_id = target.id and workspace_id = target.workspace_id and customer_id = target.customer_id;
  select count(*) into complete_operation_count
  from public.provisioning_operations
  where deployment_id = target.id and workspace_id = target.workspace_id and customer_id = target.customer_id and state = 'succeeded';
  if operation_count = 0 or operation_count <> complete_operation_count then raise exception 'provisioning operations are incomplete' using errcode = 'P0049'; end if;

  select active.deployment_id into previous_id
  from public.workspace_active_deployments as active
  where active.workspace_id = target.workspace_id
  for update;

  if previous_id = target.id then
    update public.workspaces set status = 'active', updated_at = activation_time where id = target.workspace_id;
    return query select target.workspace_id, target.customer_id, target.id, previous_id, activation_time, true;
    return;
  end if;

  insert into public.workspace_active_deployments (workspace_id, customer_id, deployment_id, changed_at)
  values (target.workspace_id, target.customer_id, target.id, activation_time)
  on conflict (workspace_id) do update
    set customer_id = excluded.customer_id,
        deployment_id = excluded.deployment_id,
        changed_at = excluded.changed_at;

  update public.workspaces
  set status = 'active', updated_at = activation_time
  where id = target.workspace_id and customer_id = target.customer_id;

  insert into public.runtime_operation_log (
    customer_id,
    workspace_id,
    deployment_id,
    job_id,
    operation_id,
    operation_type,
    actor,
    request_metadata,
    result_metadata,
    created_at
  )
  select target.customer_id,
         target.workspace_id,
         target.id,
         job.id,
         null,
         'deployment_activation',
         p_actor_user_id::text,
         jsonb_build_object(
           'previousDeploymentId', previous_id,
           'blueprintVersion', target.blueprint_version,
           'compilerVersion', target.compiler_version,
           'blueprintSchemaVersion', target.blueprint_schema_version,
           'runtimeSchemaVersion', target.runtime_schema_version,
           'capabilityRegistryVersion', target.capability_registry_version,
           'blueprintHash', target.blueprint_hash,
           'compiledWorkspaceHash', target.compiled_workspace_hash,
           'provisioningPlanHash', target.provisioning_plan_hash,
           'idempotencyKey', target.idempotency_key
         ),
         jsonb_build_object('deploymentId', target.id, 'activatedAt', activation_time),
         activation_time
  from public.provisioning_jobs as job
  where job.deployment_id = target.id
    and job.workspace_id = target.workspace_id
    and job.customer_id = target.customer_id
    and job.state = 'succeeded'
  order by job.completed_at desc nulls last
  limit 1;

  return query select target.workspace_id, target.customer_id, target.id, previous_id, activation_time, false;
end;
$$;

grant execute on function public.activate_workspace_deployment(uuid, uuid) to service_role;
