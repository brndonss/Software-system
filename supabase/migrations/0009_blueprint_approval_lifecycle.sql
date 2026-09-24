alter table public.workspace_blueprints
  add column if not exists validation_status text not null default 'unvalidated'
    check (validation_status in ('unvalidated', 'valid', 'invalid')),
  add column if not exists validated_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists rejected_at timestamptz;

create index if not exists workspace_blueprints_customer_status_version_idx
  on public.workspace_blueprints(customer_id, status, version);

update public.workspace_blueprints
set validation_status = 'valid',
    validated_at = coalesce(validated_at, updated_at)
where validation_errors is null
  and blueprint->>'schemaVersion' = '1';

-- Status and approval metadata may only change through the guarded transition functions below.
drop policy if exists "Owners can update their workspace blueprints" on public.workspace_blueprints;

create or replace function public.submit_workspace_blueprint(
  p_blueprint_id uuid,
  p_expected_version integer
)
returns public.workspace_blueprints
language plpgsql
security definer
set search_path = public
as $$
declare
  blueprint_row public.workspace_blueprints;
begin
  if auth.uid() is null or not public.is_customer_owner((select customer_id from public.workspace_blueprints where id = p_blueprint_id)) then
    raise exception 'customer scope forbidden' using errcode = '42501';
  end if;

  select * into blueprint_row
  from public.workspace_blueprints
  where id = p_blueprint_id
  for update;

  if not found then
    raise exception 'blueprint not found' using errcode = 'P0002';
  end if;
  if blueprint_row.version is distinct from p_expected_version then
    raise exception 'blueprint version conflict' using errcode = 'P0004';
  end if;
  if blueprint_row.status not in ('draft', 'rejected') then
    raise exception 'blueprint cannot be submitted from its current status' using errcode = 'P0003';
  end if;
  if blueprint_row.validation_status <> 'valid' then
    raise exception 'blueprint must be validated before submission' using errcode = 'P0005';
  end if;

  update public.workspace_blueprints
  set status = 'in_review',
      rejected_by = null,
      rejected_at = null,
      updated_at = now()
  where id = p_blueprint_id
  returning * into blueprint_row;

  update public.workspaces
  set status = case when status = 'draft' then 'ready_for_review' else status end,
      updated_at = now()
  where id = blueprint_row.workspace_id
    and customer_id = blueprint_row.customer_id;

  return blueprint_row;
end;
$$;

create or replace function public.approve_workspace_blueprint(
  p_blueprint_id uuid,
  p_expected_version integer,
  p_review_notes text default null
)
returns public.workspace_blueprints
language plpgsql
security definer
set search_path = public
as $$
declare
  blueprint_row public.workspace_blueprints;
begin
  if auth.uid() is null or not public.is_customer_owner((select customer_id from public.workspace_blueprints where id = p_blueprint_id)) then
    raise exception 'customer scope forbidden' using errcode = '42501';
  end if;

  select * into blueprint_row
  from public.workspace_blueprints
  where id = p_blueprint_id
  for update;

  if not found then
    raise exception 'blueprint not found' using errcode = 'P0002';
  end if;
  if blueprint_row.version is distinct from p_expected_version then
    raise exception 'blueprint version conflict' using errcode = 'P0004';
  end if;
  if blueprint_row.status <> 'in_review' then
    raise exception 'only blueprints in review can be approved' using errcode = 'P0003';
  end if;
  if blueprint_row.validation_status <> 'valid' then
    raise exception 'blueprint must be validated before approval' using errcode = 'P0005';
  end if;

  update public.workspace_blueprints
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      review_notes = p_review_notes,
      rejected_by = null,
      rejected_at = null,
      updated_at = now()
  where id = p_blueprint_id
  returning * into blueprint_row;

  -- Approval does not activate the workspace. Provisioning/activation is a separate phase.
  return blueprint_row;
end;
$$;

create or replace function public.reject_workspace_blueprint(
  p_blueprint_id uuid,
  p_expected_version integer,
  p_review_notes text
)
returns public.workspace_blueprints
language plpgsql
security definer
set search_path = public
as $$
declare
  blueprint_row public.workspace_blueprints;
begin
  if auth.uid() is null or not public.is_customer_owner((select customer_id from public.workspace_blueprints where id = p_blueprint_id)) then
    raise exception 'customer scope forbidden' using errcode = '42501';
  end if;

  select * into blueprint_row
  from public.workspace_blueprints
  where id = p_blueprint_id
  for update;

  if not found then
    raise exception 'blueprint not found' using errcode = 'P0002';
  end if;
  if blueprint_row.version is distinct from p_expected_version then
    raise exception 'blueprint version conflict' using errcode = 'P0004';
  end if;
  if blueprint_row.status <> 'in_review' then
    raise exception 'only blueprints in review can be rejected' using errcode = 'P0003';
  end if;
  if nullif(trim(p_review_notes), '') is null then
    raise exception 'rejection notes are required' using errcode = 'P0006';
  end if;

  update public.workspace_blueprints
  set status = 'rejected',
      approved_by = null,
      approved_at = null,
      rejected_by = auth.uid(),
      rejected_at = now(),
      review_notes = p_review_notes,
      updated_at = now()
  where id = p_blueprint_id
  returning * into blueprint_row;

  return blueprint_row;
end;
$$;

grant execute on function public.submit_workspace_blueprint(uuid, integer) to authenticated;
grant execute on function public.approve_workspace_blueprint(uuid, integer, text) to authenticated;
grant execute on function public.reject_workspace_blueprint(uuid, integer, text) to authenticated;
