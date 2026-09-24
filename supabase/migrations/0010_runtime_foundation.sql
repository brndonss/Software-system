-- Phase 3A: generic runtime metadata and record foundation.
-- Provisioning, runtime APIs, and activation remain intentionally unimplemented.

create table public.workspace_deployments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workspace_blueprint_id uuid not null references public.workspace_blueprints(id) on delete restrict,
  blueprint_version integer not null check (blueprint_version > 0),
  compiler_version integer not null check (compiler_version > 0),
  blueprint_hash text not null check (blueprint_hash ~ '^sha256-[a-f0-9]{64}$'),
  compiled_workspace_hash text not null check (compiled_workspace_hash ~ '^sha256-[a-f0-9]{64}$'),
  provisioning_plan_hash text not null check (provisioning_plan_hash ~ '^sha256-[a-f0-9]{64}$'),
  compiled_workspace jsonb not null default '{}'::jsonb,
  provisioning_plan jsonb not null default '{}'::jsonb,
  state text not null default 'draft' check (state in ('draft', 'provisioning', 'ready', 'active', 'failed', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  archived_at timestamptz,
  error_code text,
  error_message text,
  unique (workspace_id, workspace_blueprint_id, blueprint_version, compiler_version),
  unique (id, workspace_id, customer_id)
);

create index workspace_deployments_customer_idx on public.workspace_deployments(customer_id, created_at desc);
create index workspace_deployments_workspace_state_idx on public.workspace_deployments(workspace_id, state, created_at desc);
create index workspace_deployments_blueprint_idx on public.workspace_deployments(workspace_blueprint_id, blueprint_version);

create table public.workspace_active_deployments (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  deployment_id uuid not null,
  changed_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id)
    references public.workspace_deployments(id, workspace_id, customer_id)
    on delete restrict
);

create unique index workspace_active_deployments_deployment_idx
  on public.workspace_active_deployments(deployment_id);

create table public.runtime_entities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (char_length(trim(label)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 500),
  ordinal integer not null default 0 check (ordinal >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id)
    references public.workspace_deployments(id, workspace_id, customer_id)
    on delete cascade,
  unique (deployment_id, key),
  unique (id, deployment_id, workspace_id, customer_id)
);

create table public.runtime_fields (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  entity_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (char_length(trim(label)) between 1 and 80),
  data_type text not null check (data_type in ('text', 'number', 'date', 'boolean', 'select', 'currency', 'email', 'textarea')),
  required boolean not null default false,
  is_unique boolean not null default false,
  reference_entity_id uuid,
  options jsonb not null default '[]'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  ordinal integer not null default 0 check (ordinal >= 0),
  created_at timestamptz not null default now(),
  foreign key (entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete cascade,
  foreign key (reference_entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete restrict,
  unique (entity_id, key),
  unique (id, deployment_id, workspace_id, customer_id)
);

create table public.runtime_relationships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  from_entity_id uuid not null,
  to_entity_id uuid not null,
  relationship_type text not null check (relationship_type in ('one-to-one', 'one-to-many', 'many-to-many')),
  label text not null check (char_length(trim(label)) between 1 and 120),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (from_entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete restrict,
  foreign key (to_entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete restrict,
  unique (deployment_id, from_entity_id, to_entity_id, relationship_type, label)
  ,unique (id, deployment_id, workspace_id, customer_id)
);

create table public.runtime_roles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 250),
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  unique (deployment_id, key),
  unique (id, deployment_id, workspace_id, customer_id)
);

create table public.runtime_permissions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  entity_id uuid,
  field_id uuid,
  action text not null check (action in ('create', 'read', 'update', 'archive', 'assign', 'notify', 'approve', 'review')),
  scope jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete cascade,
  foreign key (field_id, deployment_id, workspace_id, customer_id) references public.runtime_fields(id, deployment_id, workspace_id, customer_id) on delete cascade,
  check (entity_id is not null or field_id is not null),
  unique (deployment_id, entity_id, field_id, action)
  ,unique (id, deployment_id, workspace_id, customer_id)
);

create table public.runtime_role_permissions (
  role_id uuid not null,
  permission_id uuid not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  primary key (role_id, permission_id),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (role_id, deployment_id, workspace_id, customer_id) references public.runtime_roles(id, deployment_id, workspace_id, customer_id) on delete cascade,
  foreign key (permission_id, deployment_id, workspace_id, customer_id) references public.runtime_permissions(id, deployment_id, workspace_id, customer_id) on delete cascade
);

create table public.runtime_workflows (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null check (char_length(trim(description)) between 1 and 500),
  trigger text not null check (trigger in ('record_created', 'record_updated', 'status_changed', 'schedule', 'manual', 'webhook')),
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  unique (deployment_id, key),
  unique (id, deployment_id, workspace_id, customer_id)
);

create table public.runtime_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  workflow_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  ordinal integer not null check (ordinal >= 0),
  step_type text not null check (step_type in ('create_record', 'update_record', 'assign', 'create_task', 'notify', 'wait', 'condition')),
  entity_id uuid,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (workflow_id, deployment_id, workspace_id, customer_id) references public.runtime_workflows(id, deployment_id, workspace_id, customer_id) on delete cascade,
  foreign key (entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete restrict,
  unique (workflow_id, key),
  unique (workflow_id, ordinal)
);

create table public.runtime_views (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(trim(name)) between 1 and 80),
  entity_id uuid,
  view_type text not null check (view_type in ('table', 'kanban', 'calendar', 'board', 'dashboard', 'detail')),
  definition jsonb not null default '{}'::jsonb,
  ordinal integer not null default 0 check (ordinal >= 0),
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete restrict,
  unique (deployment_id, key)
);

create table public.runtime_automations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  trigger text not null check (trigger in ('record_created', 'record_updated', 'status_changed', 'schedule', 'manual', 'webhook')),
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  unique (deployment_id, key)
);

create table public.runtime_integrations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  provider text not null check (char_length(trim(provider)) between 1 and 80),
  capability text not null check (char_length(trim(capability)) between 1 and 120),
  config jsonb not null default '{}'::jsonb,
  secret_ref text,
  status text not null default 'unconfigured' check (status in ('unconfigured', 'configured', 'error', 'disabled')),
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  unique (deployment_id, key)
);

create table public.runtime_reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  source_definition jsonb not null default '{}'::jsonb,
  filters jsonb not null default '[]'::jsonb,
  grouping jsonb not null default '[]'::jsonb,
  measures jsonb not null default '[]'::jsonb,
  visualization text,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  unique (deployment_id, key)
);

create table public.runtime_agents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  persona text not null check (char_length(trim(persona)) between 1 and 250),
  mission text not null check (char_length(trim(mission)) between 1 and 500),
  responsibilities jsonb not null default '[]'::jsonb,
  guardrails jsonb not null default '[]'::jsonb,
  allowed_tools jsonb not null default '[]'::jsonb,
  escalation_rules jsonb not null default '[]'::jsonb,
  model_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  unique (deployment_id)
);

create table public.runtime_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  entity_id uuid not null,
  record_key text not null check (char_length(trim(record_key)) between 1 and 200),
  record_version integer not null default 1 check (record_version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (entity_id, deployment_id, workspace_id, customer_id) references public.runtime_entities(id, deployment_id, workspace_id, customer_id) on delete restrict,
  unique (deployment_id, entity_id, record_key),
  unique (id, deployment_id, workspace_id, customer_id)
);

create table public.runtime_values (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  record_id uuid not null,
  field_id uuid not null,
  text_value text,
  number_value numeric,
  boolean_value boolean,
  date_value date,
  json_value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (record_id, deployment_id, workspace_id, customer_id) references public.runtime_records(id, deployment_id, workspace_id, customer_id) on delete cascade,
  foreign key (field_id, deployment_id, workspace_id, customer_id) references public.runtime_fields(id, deployment_id, workspace_id, customer_id) on delete restrict,
  check (num_nonnulls(text_value, number_value, boolean_value, date_value, json_value) = 1),
  unique (record_id, field_id)
);

create table public.runtime_record_relationships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  relationship_id uuid not null,
  from_record_id uuid not null,
  to_record_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (relationship_id, deployment_id, workspace_id, customer_id) references public.runtime_relationships(id, deployment_id, workspace_id, customer_id) on delete cascade,
  foreign key (from_record_id, deployment_id, workspace_id, customer_id) references public.runtime_records(id, deployment_id, workspace_id, customer_id) on delete cascade,
  foreign key (to_record_id, deployment_id, workspace_id, customer_id) references public.runtime_records(id, deployment_id, workspace_id, customer_id) on delete cascade,
  unique (relationship_id, from_record_id, to_record_id)
);

create table public.runtime_record_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deployment_id uuid not null,
  record_id uuid not null,
  event_type text not null check (char_length(trim(event_type)) between 1 and 120),
  actor_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (deployment_id, workspace_id, customer_id) references public.workspace_deployments(id, workspace_id, customer_id) on delete cascade,
  foreign key (record_id, deployment_id, workspace_id, customer_id) references public.runtime_records(id, deployment_id, workspace_id, customer_id) on delete cascade
);

create index workspace_active_deployments_customer_idx on public.workspace_active_deployments(customer_id);
create index runtime_entities_workspace_deployment_idx on public.runtime_entities(workspace_id, deployment_id, ordinal);
create index runtime_fields_entity_idx on public.runtime_fields(entity_id, ordinal);
create index runtime_records_workspace_entity_idx on public.runtime_records(workspace_id, deployment_id, entity_id, updated_at desc);
create index runtime_records_record_idx on public.runtime_values(record_id, field_id);
create index runtime_record_relationships_endpoint_idx on public.runtime_record_relationships(from_record_id, to_record_id);
create index runtime_record_events_record_idx on public.runtime_record_events(record_id, created_at desc);

create trigger runtime_records_set_updated_at before update on public.runtime_records for each row execute function public.set_updated_at();
create trigger runtime_values_set_updated_at before update on public.runtime_values for each row execute function public.set_updated_at();

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and public.is_customer_owner(customer_id)
  );
$$;

create or replace function public.is_workspace_deployment_owner(target_deployment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_deployments
    where id = target_deployment_id
      and public.is_workspace_owner(workspace_id)
  );
$$;

create or replace function public.is_active_workspace_deployment(target_workspace_id uuid, target_deployment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_active_deployments
    where workspace_id = target_workspace_id
      and deployment_id = target_deployment_id
  );
$$;

-- Owner-only V1 access. Write policies are intentionally absent until the provisioning worker/runtime API exists.
alter table public.workspace_deployments enable row level security;
alter table public.workspace_active_deployments enable row level security;
alter table public.runtime_entities enable row level security;
alter table public.runtime_fields enable row level security;
alter table public.runtime_relationships enable row level security;
alter table public.runtime_roles enable row level security;
alter table public.runtime_permissions enable row level security;
alter table public.runtime_role_permissions enable row level security;
alter table public.runtime_workflows enable row level security;
alter table public.runtime_workflow_steps enable row level security;
alter table public.runtime_views enable row level security;
alter table public.runtime_automations enable row level security;
alter table public.runtime_integrations enable row level security;
alter table public.runtime_reports enable row level security;
alter table public.runtime_agents enable row level security;
alter table public.runtime_records enable row level security;
alter table public.runtime_values enable row level security;
alter table public.runtime_record_relationships enable row level security;
alter table public.runtime_record_events enable row level security;

create policy "Owners can read workspace deployments" on public.workspace_deployments for select to authenticated using ((select public.is_workspace_owner(workspace_id)));
create policy "Owners can read active workspace deployments" on public.workspace_active_deployments for select to authenticated using ((select public.is_workspace_owner(workspace_id)));

create policy "Owners can read runtime entities" on public.runtime_entities for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and status = 'active' and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime fields" on public.runtime_fields for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime relationships" on public.runtime_relationships for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime roles" on public.runtime_roles for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime permissions" on public.runtime_permissions for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime role permissions" on public.runtime_role_permissions for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime workflows" on public.runtime_workflows for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime workflow steps" on public.runtime_workflow_steps for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime views" on public.runtime_views for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime automations" on public.runtime_automations for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime integrations" on public.runtime_integrations for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime reports" on public.runtime_reports for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime agents" on public.runtime_agents for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime records" on public.runtime_records for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)) and deleted_at is null);
create policy "Owners can read runtime values" on public.runtime_values for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime record relationships" on public.runtime_record_relationships for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
create policy "Owners can read runtime record events" on public.runtime_record_events for select to authenticated using ((select public.is_workspace_owner(workspace_id)) and (select public.is_active_workspace_deployment(workspace_id, deployment_id)));
