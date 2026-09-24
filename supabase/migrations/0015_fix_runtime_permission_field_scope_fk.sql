-- Drop the PostgreSQL-truncated legacy field FK name left by 0014,
-- then retain only the correctly ordered scoped identity reference.

alter table public.runtime_permissions
  drop constraint if exists runtime_permissions_deployment_id_field_id_workspace_id_cu_fkey;
