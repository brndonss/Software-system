import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  compileApprovedBlueprint,
  provisioningOperationSchema,
  type CanonicalCompiledWorkspace,
  type ProvisioningOperation,
} from "@/lib/system-builder/compiler";
import { stableStringify } from "@/lib/system-builder/compiler/canonicalize";

const leaseSeconds = 300;

type WorkerClient = ReturnType<typeof createSupabaseAdminClient>;
type Row = Record<string, unknown>;

type JobRow = Row & {
  id: string;
  customer_id: string;
  workspace_id: string;
  deployment_id: string;
  lease_token: string;
  attempt_count: number;
};

type OperationRow = Row & {
  id: string;
  job_id: string;
  operation_id: string;
  operation_kind?: string;
  kind: string;
  target_key: string;
  payload: unknown;
  depends_on: unknown;
  attempt_count: number;
  lease_token: string;
};

export class ProvisioningWorkerError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryable = false) {
    super(message);
    this.name = "ProvisioningWorkerError";
  }
}

export function hasDependencyCycle(operations: Array<{ operationId: string; dependsOn: string[] }>): boolean {
  const graph = new Map(operations.map((operation) => [operation.operationId, operation.dependsOn]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(operationId: string): boolean {
    if (visiting.has(operationId)) return true;
    if (visited.has(operationId)) return false;
    visiting.add(operationId);
    for (const dependency of graph.get(operationId) ?? []) if (graph.has(dependency) && visit(dependency)) return true;
    visiting.delete(operationId);
    visited.add(operationId);
    return false;
  }
  return [...graph.keys()].some(visit);
}

function asRow(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProvisioningWorkerError("invalid_database_row", "Expected an object row");
  return value as Row;
}

function asArray(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRow);
}

function isTransient(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return ["40001", "40P01", "08", "53"].some((prefix) => code === prefix || code.startsWith(prefix));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String(error.message) : "Unknown provisioning error";
}

function jsonEquals(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

export function workflowStepOrdinal(workspace: CanonicalCompiledWorkspace, workflowKey: string, stepKey: string): number {
  const workflow = workspace.workflows.find((item) => item.key === workflowKey);
  const ordinal = workflow?.steps.findIndex((step) => step.key === stepKey) ?? -1;
  if (ordinal < 0) throw new ProvisioningWorkerError("missing_compiled_workflow_step", `Workflow step ${workflowKey}.${stepKey} is not present in the compiled workspace`);
  return ordinal;
}

async function rpc<T>(client: WorkerClient, name: string, args: Record<string, unknown>): Promise<T> {
  const result = await client.rpc(name, args);
  if (result.error) throw result.error;
  return result.data as T;
}

async function loadDeploymentContext(client: WorkerClient, job: JobRow) {
  const deploymentResult = await client.from("workspace_deployments").select("*").eq("id", job.deployment_id).eq("workspace_id", job.workspace_id).eq("customer_id", job.customer_id).maybeSingle();
  if (deploymentResult.error || !deploymentResult.data) throw new ProvisioningWorkerError("deployment_not_found", "Deployment does not belong to the claimed job");
  const deployment = asRow(deploymentResult.data);
  const blueprintResult = await client.from("workspace_blueprints").select("id, customer_id, workspace_id, version, status, validation_status, blueprint").eq("id", deployment.workspace_blueprint_id).eq("customer_id", job.customer_id).eq("workspace_id", job.workspace_id).maybeSingle();
  if (blueprintResult.error || !blueprintResult.data) throw new ProvisioningWorkerError("blueprint_not_found", "Approved blueprint was not found");
  const blueprint = asRow(blueprintResult.data);
  if (blueprint.status !== "approved" || blueprint.validation_status !== "valid") throw new ProvisioningWorkerError("blueprint_not_approved", "Deployment blueprint is no longer approved and valid");
  if (blueprint.version !== deployment.blueprint_version) throw new ProvisioningWorkerError("blueprint_version_mismatch", "Blueprint version does not match deployment");

  const operationsResult = await client.from("provisioning_operations").select("*").eq("job_id", job.id).eq("deployment_id", job.deployment_id).eq("workspace_id", job.workspace_id).eq("customer_id", job.customer_id).order("created_at", { ascending: true });
  if (operationsResult.error) throw operationsResult.error;
  return { deployment, blueprint, operations: asArray(operationsResult.data) as OperationRow[] };
}

async function verifyArtifacts(client: WorkerClient, job: JobRow) {
  const context = await loadDeploymentContext(client, job);
  const compiled = await compileApprovedBlueprint({
    workspaceId: job.workspace_id,
    blueprintId: String(context.blueprint.id),
    blueprintVersion: Number(context.blueprint.version),
    blueprintStatus: "approved",
    validationStatus: "valid",
    blueprint: context.blueprint.blueprint,
  });
  const deployment = context.deployment;
  if (!['queued', 'provisioning'].includes(String(deployment.state))) throw new ProvisioningWorkerError("deployment_not_eligible", `Deployment state ${String(deployment.state)} is not eligible for provisioning`);
  const checks: Array<[string, unknown, unknown]> = [
    ["blueprint_version", compiled.source.blueprintVersion, deployment.blueprint_version],
    ["compiler_version", compiled.compatibility.compilerVersion, deployment.compiler_version],
    ["blueprint_schema_version", compiled.compatibility.blueprintSchemaVersion, deployment.blueprint_schema_version],
    ["runtime_schema_version", compiled.compatibility.runtimeSchemaVersion, deployment.runtime_schema_version],
    ["capability_registry_version", compiled.compatibility.capabilityRegistryVersion, deployment.capability_registry_version],
    ["blueprint_hash", compiled.source.blueprintHash, deployment.blueprint_hash],
    ["compiled_workspace_hash", compiled.compiledWorkspaceHash, deployment.compiled_workspace_hash],
    ["provisioning_plan_hash", compiled.provisioningPlanHash, deployment.provisioning_plan_hash],
    ["idempotency_key", compiled.idempotencyKey, deployment.idempotency_key],
  ];
  for (const [name, actual, expected] of checks) if (actual !== expected) throw new ProvisioningWorkerError("artifact_mismatch", `${name} does not match persisted deployment artifact`);
  if (!jsonEquals(compiled.compiledWorkspace, deployment.compiled_workspace)) throw new ProvisioningWorkerError("compiled_workspace_mismatch", "Persisted compiled workspace differs from deterministic compilation");
  if (!jsonEquals(compiled.provisioningPlan, deployment.provisioning_plan)) throw new ProvisioningWorkerError("provisioning_plan_mismatch", "Persisted provisioning plan differs from deterministic compilation");
  const expectedOperations = compiled.provisioningPlan.operations;
  if (hasDependencyCycle(expectedOperations)) throw new ProvisioningWorkerError("dependency_cycle", "Provisioning plan contains a dependency cycle");
  if (context.operations.length !== expectedOperations.length) throw new ProvisioningWorkerError("operation_set_mismatch", "Persisted operation count differs from compiled plan");
  for (const expected of expectedOperations) {
    const actual = context.operations.find((operation) => operation.operation_id === expected.operationId);
    if (!actual || actual.kind !== expected.kind || actual.target_key !== expected.targetKey || !jsonEquals(actual.payload, expected.payload) || !jsonEquals(actual.depends_on, expected.dependsOn)) throw new ProvisioningWorkerError("operation_mismatch", `Persisted operation ${expected.operationId} differs from compiled plan`);
  }
  return { ...context, compiled };
}

async function ensureRow(client: WorkerClient, table: string, filters: Record<string, string>, insert: Record<string, unknown>, immutable: Record<string, unknown>) {
  let query = client.from(table).select("*");
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const existing = await query.maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const row = asRow(existing.data);
    for (const [key, value] of Object.entries(immutable)) if (!jsonEquals(row[key], value)) throw new ProvisioningWorkerError("runtime_conflict", `${table} ${JSON.stringify(filters)} conflicts with immutable state`);
    return row;
  }
  const created = await client.from(table).insert(insert).select("*").single();
  if (created.error || !created.data) throw created.error ?? new Error(`Unable to create ${table}`);
  return asRow(created.data);
}

async function executeOperation(client: WorkerClient, job: JobRow, operation: ProvisioningOperation, workspace: CanonicalCompiledWorkspace) {
  const scope = { customer_id: job.customer_id, workspace_id: job.workspace_id, deployment_id: job.deployment_id };
  const payload = operation.payload as Row;
  switch (operation.kind) {
    case "register_entity": {
      await ensureRow(client, "runtime_entities", { ...scope, key: operation.targetKey }, { ...scope, key: payload.key, label: payload.label, description: payload.description, ordinal: 0 }, { key: payload.key, label: payload.label, description: payload.description });
      return;
    }
    case "register_field": {
      const entityKey = operation.targetKey.split(".")[0];
      const entity = await client.from("runtime_entities").select("id").match({ ...scope, key: entityKey }).single();
      if (entity.error || !entity.data) throw new ProvisioningWorkerError("missing_runtime_entity", `Entity ${entityKey} is not materialized`);
      let referenceEntityId: string | null = null;
      if (payload.referenceEntity) {
        const reference = await client.from("runtime_entities").select("id").match({ ...scope, key: payload.referenceEntity }).single();
        if (reference.error || !reference.data) throw new ProvisioningWorkerError("missing_reference_entity", `Reference entity ${payload.referenceEntity} is not materialized`);
        referenceEntityId = String(reference.data.id);
      }
      await ensureRow(client, "runtime_fields", { ...scope, entity_id: String(entity.data.id), key: payload.key as string }, { ...scope, entity_id: entity.data.id, key: payload.key, label: payload.label, data_type: payload.type, required: payload.required, is_unique: payload.unique, reference_entity_id: referenceEntityId, options: payload.options ?? [], validation: { ...(payload.validation as Row), nullable: payload.nullable, defaultValue: payload.defaultValue, relationshipType: payload.relationshipType, referenceEntity: payload.referenceEntity } }, { key: payload.key, label: payload.label, data_type: payload.type, required: payload.required, is_unique: payload.unique, reference_entity_id: referenceEntityId, options: payload.options ?? [] });
      return;
    }
    case "register_relationship": {
      const from = await client.from("runtime_entities").select("id").match({ ...scope, key: payload.fromEntity }).single();
      const to = await client.from("runtime_entities").select("id").match({ ...scope, key: payload.toEntity }).single();
      if (from.error || to.error || !from.data || !to.data) throw new ProvisioningWorkerError("missing_runtime_entity", "Relationship entity is not materialized");
      await ensureRow(client, "runtime_relationships", { ...scope, from_entity_id: String(from.data.id), to_entity_id: String(to.data.id), relationship_type: String(payload.relationshipType), label: String(payload.label) }, { ...scope, from_entity_id: from.data.id, to_entity_id: to.data.id, relationship_type: payload.relationshipType, label: payload.label, config: {} }, { from_entity_id: from.data.id, to_entity_id: to.data.id, relationship_type: payload.relationshipType, label: payload.label });
      return;
    }
    case "register_role":
      await ensureRow(client, "runtime_roles", { ...scope, key: operation.targetKey }, { ...scope, key: payload.key, name: payload.name, description: payload.description }, { key: payload.key, name: payload.name, description: payload.description }); return;
    case "register_permission": {
      const permission = (payload.permission as Row);
      const entity = await client.from("runtime_entities").select("id").match({ ...scope, key: permission.entity as string }).single();
      if (entity.error || !entity.data) throw new ProvisioningWorkerError("missing_runtime_entity", "Permission entity is not materialized");
      let fieldId: string | null = null;
      if (permission.field) {
        const field = await client.from("runtime_fields").select("id").match({ ...scope, entity_id: entity.data.id, key: permission.field as string }).single();
        if (field.error || !field.data) throw new ProvisioningWorkerError("missing_runtime_field", "Permission field is not materialized");
        fieldId = String(field.data.id);
      }
      const role = await client.from("runtime_roles").select("id").match({ ...scope, key: payload.roleKey as string }).single();
      if (role.error || !role.data) throw new ProvisioningWorkerError("missing_runtime_role", "Permission role is not materialized");
      const permissionRow = await ensureRow(client, "runtime_permissions", { ...scope, entity_id: String(entity.data.id), action: permission.action as string, ...(fieldId ? { field_id: fieldId } : {}) }, { ...scope, entity_id: entity.data.id, field_id: fieldId, action: permission.action, scope: {} }, { entity_id: entity.data.id, field_id: fieldId, action: permission.action });
      await ensureRow(client, "runtime_role_permissions", { role_id: String(role.data.id), permission_id: String(permissionRow.id), ...scope }, { role_id: role.data.id, permission_id: permissionRow.id, ...scope }, { role_id: role.data.id, permission_id: permissionRow.id });
      return;
    }
    case "register_workflow":
      await ensureRow(client, "runtime_workflows", { ...scope, key: operation.targetKey }, { ...scope, key: payload.key, name: payload.name, description: payload.description, trigger: payload.trigger, config: { triggerConfig: payload.triggerConfig }, enabled: true }, { key: payload.key, name: payload.name, description: payload.description, trigger: payload.trigger, config: { triggerConfig: payload.triggerConfig } }); return;
    case "register_workflow_step": {
      const workflowKey = operation.targetKey.split(".")[0];
      const stepKey = payload.key as string;
      const ordinal = workflowStepOrdinal(workspace, workflowKey, stepKey);
      const workflow = await client.from("runtime_workflows").select("id").match({ ...scope, key: workflowKey }).single();
      if (workflow.error || !workflow.data) throw new ProvisioningWorkerError("missing_runtime_workflow", "Workflow is not materialized");
      let entityId: string | null = null;
      if (payload.entity) {
        const entity = await client.from("runtime_entities").select("id").match({ ...scope, key: payload.entity as string }).single();
        if (entity.error || !entity.data) throw new ProvisioningWorkerError("missing_runtime_entity", "Workflow step entity is not materialized");
        entityId = String(entity.data.id);
      }
      await ensureRow(client, "runtime_workflow_steps", { ...scope, workflow_id: String(workflow.data.id), key: stepKey }, { ...scope, workflow_id: workflow.data.id, key: stepKey, ordinal, step_type: payload.type, entity_id: entityId, config: payload.config ?? {} }, { workflow_id: workflow.data.id, key: stepKey, ordinal, step_type: payload.type, entity_id: entityId, config: payload.config ?? {} }); return;
    }
    case "register_view": {
      const entity = await client.from("runtime_entities").select("id").match({ ...scope, key: payload.entity as string }).single();
      if (entity.error || !entity.data) throw new ProvisioningWorkerError("missing_runtime_entity", "View entity is not materialized");
      await ensureRow(client, "runtime_views", { ...scope, key: operation.targetKey }, { ...scope, key: payload.key, name: payload.name, entity_id: entity.data.id, view_type: payload.type, definition: { entity: payload.entity }, ordinal: 0 }, { key: payload.key, name: payload.name, entity_id: entity.data.id, view_type: payload.type, definition: { entity: payload.entity } }); return;
    }
    case "register_automation":
      await ensureRow(client, "runtime_automations", { ...scope, key: operation.targetKey }, { ...scope, key: payload.key, trigger: payload.trigger, conditions: payload.conditions ?? [], actions: payload.actions ?? [], enabled: true }, { key: payload.key, trigger: payload.trigger, conditions: payload.conditions ?? [], actions: payload.actions ?? [] }); return;
    case "register_integration":
      await ensureRow(client, "runtime_integrations", { ...scope, key: operation.targetKey }, { ...scope, key: payload.key, provider: payload.provider, capability: payload.capability, config: payload.config ?? {}, secret_ref: payload.secret_ref ?? null, status: payload.status ?? "unconfigured" }, { key: payload.key, provider: payload.provider, capability: payload.capability, config: payload.config ?? {}, secret_ref: payload.secret_ref ?? null, status: payload.status ?? "unconfigured" }); return;
    case "register_report":
      await ensureRow(client, "runtime_reports", { ...scope, key: operation.targetKey }, { ...scope, key: payload.key, name: payload.name, source_definition: payload.source_definition ?? {}, filters: payload.filters ?? [], grouping: payload.grouping ?? [], measures: payload.measures ?? [], visualization: payload.visualization ?? "table" }, { key: payload.key, name: payload.name, source_definition: payload.source_definition ?? {}, filters: payload.filters ?? [], grouping: payload.grouping ?? [], measures: payload.measures ?? [], visualization: payload.visualization ?? "table" }); return;
    case "register_agent": {
      const agent = payload;
      await ensureRow(client, "runtime_agents", { ...scope, deployment_id: job.deployment_id }, { ...scope, name: agent.name, persona: agent.persona, mission: agent.mission, responsibilities: agent.responsibilities ?? [], guardrails: agent.guardrails ?? [], allowed_tools: agent.allowedTools ?? [], escalation_rules: agent.escalationRules ?? [], model_config: { key: agent.key, allowedEntities: agent.allowedEntities ?? [], allowedActions: agent.allowedActions ?? [], integrations: agent.integrations ?? [], ...(agent.modelConfig as Row ?? {}) } }, { name: agent.name, persona: agent.persona, mission: agent.mission, responsibilities: agent.responsibilities ?? [], guardrails: agent.guardrails ?? [], allowed_tools: agent.allowedTools ?? [], escalation_rules: agent.escalationRules ?? [], model_config: { key: agent.key, allowedEntities: agent.allowedEntities ?? [], allowedActions: agent.allowedActions ?? [], integrations: agent.integrations ?? [], ...(agent.modelConfig as Row ?? {}) } }); return;
    }
  }
}

export async function executeProvisioningJob(jobId: string, workerIdentity: string) {
  const client = createSupabaseAdminClient();
  const jobResult = await client.from("provisioning_jobs").select("*").eq("id", jobId).maybeSingle();
  if (jobResult.error || !jobResult.data) throw new ProvisioningWorkerError("job_not_found", "Provisioning job not found");
  const job = asRow(jobResult.data) as unknown as JobRow;
  if (job.state !== "running" || job.lease_owner !== workerIdentity || !job.lease_token) throw new ProvisioningWorkerError("job_not_claimed", "Job must be claimed by this worker before execution");
  await client.from("provisioning_attempts").insert({ customer_id: job.customer_id, workspace_id: job.workspace_id, deployment_id: job.deployment_id, job_id: job.id, attempt_number: job.attempt_count, worker_identity: workerIdentity, started_at: new Date().toISOString(), details: { scope: "job" } });
  let context: Awaited<ReturnType<typeof verifyArtifacts>>;
  try {
    context = await verifyArtifacts(client, job);
  } catch (error) {
    const retryable = error instanceof ProvisioningWorkerError ? error.retryable : isTransient(error);
    await rpc(client, "fail_provisioning_job", { p_job_id: job.id, p_lease_token: job.lease_token, p_retryable: retryable, p_error_code: error instanceof ProvisioningWorkerError ? error.code : "artifact_verification_failed", p_error_message: errorMessage(error) });
    await client.from("provisioning_attempts").update({ finished_at: new Date().toISOString(), outcome: retryable ? "retry_wait" : "failed", error_code: error instanceof ProvisioningWorkerError ? error.code : "artifact_verification_failed", error_message: errorMessage(error) }).eq("job_id", job.id).is("operation_id", null).eq("attempt_number", job.attempt_count);
    return { state: retryable ? "retry_wait" : "failed" };
  }
  while (true) {
    const operation = await rpc<OperationRow | null>(client, "claim_provisioning_operation", { p_job_id: job.id, p_job_lease_token: job.lease_token, p_worker_identity: workerIdentity, p_lease_seconds: leaseSeconds });
    if (!operation) break;
    const startedAt = new Date().toISOString();
    await client.from("provisioning_attempts").insert({ customer_id: job.customer_id, workspace_id: job.workspace_id, deployment_id: job.deployment_id, job_id: job.id, operation_id: operation.id, attempt_number: operation.attempt_count, worker_identity: workerIdentity, started_at: startedAt, details: {} });
    try {
      const parsed = provisioningOperationSchema.parse({ operationId: operation.operation_id, kind: operation.kind, targetKey: operation.target_key, dependsOn: operation.depends_on, payload: operation.payload });
      const jobHeartbeat = await rpc<boolean>(client, "heartbeat_provisioning_job", { p_job_id: job.id, p_lease_token: job.lease_token, p_lease_seconds: leaseSeconds });
      if (!jobHeartbeat) throw new ProvisioningWorkerError("lease_lost", "Job lease was lost");
      const operationHeartbeat = await rpc<boolean>(client, "heartbeat_provisioning_operation", { p_operation_id: operation.id, p_lease_token: operation.lease_token, p_lease_seconds: leaseSeconds });
      if (!operationHeartbeat) throw new ProvisioningWorkerError("lease_lost", "Operation lease was lost");
      await executeOperation(client, job, parsed, context.compiled.compiledWorkspace);
      await rpc(client, "complete_provisioning_operation", { p_operation_id: operation.id, p_lease_token: operation.lease_token, p_result: { operationId: parsed.operationId, completedAt: new Date().toISOString() } });
      await client.from("provisioning_attempts").update({ finished_at: new Date().toISOString(), outcome: "succeeded" }).eq("operation_id", operation.id).eq("attempt_number", operation.attempt_count);
      await client.from("runtime_operation_log").insert({ customer_id: job.customer_id, workspace_id: job.workspace_id, deployment_id: job.deployment_id, job_id: job.id, operation_id: operation.id, operation_type: parsed.kind, actor: workerIdentity, request_metadata: { operationId: parsed.operationId }, result_metadata: { outcome: "succeeded" } });
    } catch (error) {
      if (error instanceof ProvisioningWorkerError && error.code === "lease_lost") return { state: "lease_lost" };
      const retryable = error instanceof ProvisioningWorkerError ? error.retryable : isTransient(error);
      const message = errorMessage(error);
      await rpc(client, "fail_provisioning_operation", { p_operation_id: operation.id, p_lease_token: operation.lease_token, p_retryable: retryable, p_error_code: error instanceof ProvisioningWorkerError ? error.code : "operation_failed", p_error_message: message, p_backoff_seconds: Math.min(3600, 2 ** Math.min(operation.attempt_count, 8) * 10) });
      await client.from("provisioning_attempts").update({ finished_at: new Date().toISOString(), outcome: retryable ? "retry_wait" : "failed", error_code: error instanceof ProvisioningWorkerError ? error.code : "operation_failed", error_message: message }).eq("operation_id", operation.id).eq("attempt_number", operation.attempt_count);
      await client.from("runtime_operation_log").insert({ customer_id: job.customer_id, workspace_id: job.workspace_id, deployment_id: job.deployment_id, job_id: job.id, operation_id: operation.id, operation_type: operation.kind, actor: workerIdentity, request_metadata: { operationId: operation.operation_id }, result_metadata: { outcome: retryable ? "retry_wait" : "failed", error: message } });
      await rpc(client, "fail_provisioning_job", { p_job_id: job.id, p_lease_token: job.lease_token, p_retryable: retryable, p_error_code: error instanceof ProvisioningWorkerError ? error.code : "operation_failed", p_error_message: message, p_backoff_seconds: Math.min(3600, 2 ** Math.min(operation.attempt_count, 8) * 10) });
      await client.from("provisioning_attempts").update({ finished_at: new Date().toISOString(), outcome: retryable ? "retry_wait" : "failed", error_code: error instanceof ProvisioningWorkerError ? error.code : "operation_failed", error_message: message }).eq("job_id", job.id).is("operation_id", null).eq("attempt_number", job.attempt_count);
      return { state: retryable ? "retry_wait" : "failed" };
    }
  }
  const incomplete = await client.from("provisioning_operations").select("operation_id, state").eq("job_id", job.id).neq("state", "succeeded");
  if (incomplete.error || (incomplete.data ?? []).length > 0) {
    const error = new ProvisioningWorkerError("dependency_blocked", "No dependency-ready operation remains; provisioning cannot complete");
    await rpc(client, "fail_provisioning_job", { p_job_id: job.id, p_lease_token: job.lease_token, p_retryable: false, p_error_code: error.code, p_error_message: error.message });
    return { state: "failed" };
  }
  await rpc(client, "complete_provisioning_job", { p_job_id: job.id, p_lease_token: job.lease_token });
  await client.from("provisioning_attempts").update({ finished_at: new Date().toISOString(), outcome: "succeeded" }).eq("job_id", job.id).is("operation_id", null).eq("attempt_number", job.attempt_count);
  return { state: "succeeded" };
}

export async function claimNextProvisioningJob(workerIdentity: string) {
  const client = createSupabaseAdminClient();
  return rpc<JobRow | null>(client, "claim_provisioning_job", { p_worker_identity: workerIdentity, p_lease_seconds: leaseSeconds });
}
