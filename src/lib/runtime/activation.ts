import { compileApprovedBlueprint, type CompileResult } from "@/lib/system-builder/compiler";
import { stableStringify } from "@/lib/system-builder/compiler/canonicalize";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { RuntimeServiceError, type RuntimeContext } from "./service";

function sameJson(left: unknown, right: unknown) { return stableStringify(left) === stableStringify(right); }

async function verifyDeploymentArtifact(context: RuntimeContext, deploymentId: string): Promise<{ compiled: CompileResult; deployment: Record<string, unknown> }> {
  const client = createSupabaseAdminClient();
  const deploymentResult = await client.from("workspace_deployments").select("*").eq("id", deploymentId).eq("workspace_id", context.workspaceId).eq("customer_id", context.customerId).maybeSingle();
  if (deploymentResult.error || !deploymentResult.data) throw new RuntimeServiceError("deployment_not_found", "Deployment not found", 404);
  const deployment = deploymentResult.data as Record<string, unknown>;
  if (deployment.state !== "ready") throw new RuntimeServiceError("deployment_not_ready", "Deployment is not ready for activation", 409);
  if (deployment.archived_at) throw new RuntimeServiceError("deployment_archived", "Deployment is archived", 409);

  const blueprintResult = await client.from("workspace_blueprints").select("id, version, status, validation_status, blueprint").eq("id", deployment.workspace_blueprint_id).eq("workspace_id", context.workspaceId).eq("customer_id", context.customerId).maybeSingle();
  if (blueprintResult.error || !blueprintResult.data) throw new RuntimeServiceError("blueprint_not_found", "Deployment blueprint not found", 404);
  const blueprint = blueprintResult.data as Record<string, unknown>;
  if (blueprint.status !== "approved") throw new RuntimeServiceError("blueprint_not_approved", "Blueprint is not approved", 409);
  if (blueprint.validation_status !== "valid") throw new RuntimeServiceError("blueprint_invalid", "Blueprint validation is invalid", 422);
  if (blueprint.version !== deployment.blueprint_version) throw new RuntimeServiceError("artifact_mismatch", "Blueprint version does not match deployment", 409);

  const jobResult = await client.from("provisioning_jobs").select("id, state, idempotency_key").eq("deployment_id", deploymentId).eq("workspace_id", context.workspaceId).eq("customer_id", context.customerId).eq("state", "succeeded").maybeSingle();
  if (jobResult.error || !jobResult.data) throw new RuntimeServiceError("provisioning_incomplete", "Provisioning job has not succeeded", 409);

  const operationResult = await client.from("provisioning_operations").select("operation_id, kind, target_key, payload, depends_on, state").eq("job_id", jobResult.data.id).eq("deployment_id", deploymentId).eq("workspace_id", context.workspaceId).eq("customer_id", context.customerId);
  if (operationResult.error || !operationResult.data?.length || operationResult.data.some((operation) => operation.state !== "succeeded")) throw new RuntimeServiceError("provisioning_incomplete", "Provisioning operations are incomplete", 409);

  let compiled: CompileResult;
  try {
    compiled = await compileApprovedBlueprint({ workspaceId: context.workspaceId, blueprintId: String(blueprint.id ?? deployment.workspace_blueprint_id), blueprintVersion: Number(blueprint.version), blueprintStatus: "approved", validationStatus: "valid", blueprint: blueprint.blueprint });
  } catch {
    throw new RuntimeServiceError("artifact_mismatch", "Approved blueprint cannot be deterministically compiled", 409);
  }

  const checks: Array<[string, unknown, unknown]> = [
    ["blueprintVersion", compiled.source.blueprintVersion, deployment.blueprint_version],
    ["compilerVersion", compiled.compatibility.compilerVersion, deployment.compiler_version],
    ["blueprintSchemaVersion", compiled.compatibility.blueprintSchemaVersion, deployment.blueprint_schema_version],
    ["runtimeSchemaVersion", compiled.compatibility.runtimeSchemaVersion, deployment.runtime_schema_version],
    ["capabilityRegistryVersion", compiled.compatibility.capabilityRegistryVersion, deployment.capability_registry_version],
    ["blueprintHash", compiled.source.blueprintHash, deployment.blueprint_hash],
    ["compiledWorkspaceHash", compiled.compiledWorkspaceHash, deployment.compiled_workspace_hash],
    ["provisioningPlanHash", compiled.provisioningPlanHash, deployment.provisioning_plan_hash],
    ["idempotencyKey", compiled.idempotencyKey, deployment.idempotency_key],
  ];
  for (const [name, actual, expected] of checks) if (actual !== expected) throw new RuntimeServiceError("artifact_mismatch", `Deployment ${name} does not match its compiled artifact`, 409);
  if (!sameJson(compiled.compiledWorkspace, deployment.compiled_workspace) || !sameJson(compiled.provisioningPlan, deployment.provisioning_plan)) throw new RuntimeServiceError("artifact_mismatch", "Deployment artifacts do not match deterministic compilation", 409);
  if (String(jobResult.data.idempotency_key) !== String(deployment.idempotency_key)) throw new RuntimeServiceError("artifact_mismatch", "Provisioning job idempotency does not match deployment", 409);
  return { compiled, deployment };
}

export async function activateDeployment(context: RuntimeContext, deploymentId: string, actorUserId: string) {
  await verifyDeploymentArtifact(context, deploymentId);
  const admin = createSupabaseAdminClient();
  const result = await admin.rpc("activate_workspace_deployment", { p_deployment_id: deploymentId, p_actor_user_id: actorUserId });
  if (result.error) {
    const code = result.error.code;
    if (code === "42501") throw new RuntimeServiceError("unauthorized", "You are not authorized to activate this deployment", 403);
    if (code === "P0043") throw new RuntimeServiceError("blueprint_not_approved", "Blueprint is not approved", 409);
    if (code === "P0044") throw new RuntimeServiceError("blueprint_invalid", "Blueprint validation is invalid", 422);
    if (code === "P0045") throw new RuntimeServiceError("deployment_not_ready", "Deployment is not ready for activation", 409);
    if (code === "P0046") throw new RuntimeServiceError("deployment_archived", "Deployment is archived", 409);
    if (code === "P0047") throw new RuntimeServiceError("unsupported_compatibility", "Deployment compatibility is unsupported", 409);
    if (code === "P0048" || code === "P0049") throw new RuntimeServiceError("provisioning_incomplete", "Provisioning is incomplete", 409);
    throw new RuntimeServiceError("activation_failed", "Unable to activate deployment", 500);
  }
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row;
}

export { verifyDeploymentArtifact };
