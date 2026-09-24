-- Correct the scoped identity column order for runtime permission references.
-- The referenced identity is (id, deployment_id, workspace_id, customer_id).

alter table public.runtime_permissions
  drop constraint if exists runtime_permissions_deployment_id_entity_id_workspace_id_c_fkey,
  drop constraint if exists runtime_permissions_deployment_id_field_id_workspace_id_c_fkey;

alter table public.runtime_permissions
  add constraint runtime_permissions_entity_scope_fkey
    foreign key (entity_id, deployment_id, workspace_id, customer_id)
    references public.runtime_entities(id, deployment_id, workspace_id, customer_id)
    on delete cascade,
  add constraint runtime_permissions_field_scope_fkey
    foreign key (field_id, deployment_id, workspace_id, customer_id)
    references public.runtime_fields(id, deployment_id, workspace_id, customer_id)
    on delete cascade;