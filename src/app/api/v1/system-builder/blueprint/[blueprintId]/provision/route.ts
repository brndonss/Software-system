import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { compileApprovedBlueprint } from "@/lib/system-builder/compiler";
import { executeProvisioningJob, claimNextProvisioningJob } from "@/lib/system-builder/provisioning/worker";

const blueprintIdSchema = z.string().uuid();
const deploymentSelect = "id, workspace_id, customer_id, workspace_blueprint_id, state, error_code, error_message, ready_at";

export async function POST(_: Request, { params }: { params: Promise<{ blueprintId: string }> }) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;
  const parsed = blueprintIdSchema.safeParse((await params).blueprintId);
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_blueprint_id", message: "Invalid blueprint ID" } }, { status: 422 });

  const admin = createSupabaseAdminClient();
  const blueprintResult = await admin.from("workspace_blueprints").select("id, customer_id, workspace_id, version, status, validation_status, blueprint").eq("id", parsed.data).eq("customer_id", resolved.customerId).maybeSingle();
  if (blueprintResult.error || !blueprintResult.data) return NextResponse.json({ error: { code: "blueprint_not_found", message: "Blueprint not found" } }, { status: 404 });
  const blueprint = blueprintResult.data;
  if (blueprint.status !== "approved" || blueprint.validation_status !== "valid") return NextResponse.json({ error: { code: "blueprint_not_approved", message: "Blueprint must be approved before provisioning" } }, { status: 409 });

  const compiled = await compileApprovedBlueprint({
    workspaceId: blueprint.workspace_id,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    blueprintStatus: "approved",
    validationStatus: "valid",
    blueprint: blueprint.blueprint,
  });

  const existing = await admin.from("workspace_deployments").select(deploymentSelect).eq("workspace_blueprint_id", blueprint.id).eq("blueprint_version", blueprint.version).eq("workspace_id", blueprint.workspace_id).eq("customer_id", resolved.customerId).maybeSingle();
  if (existing.data) {
    const existingJob = await admin.from("provisioning_jobs").select("id, state").eq("deployment_id", existing.data.id).eq("workspace_id", blueprint.workspace_id).eq("customer_id", resolved.customerId).maybeSingle();
    if (existingJob.error) return NextResponse.json({ error: { code: "provisioning_job_fetch_failed", message: "Unable to load provisioning state" } }, { status: 500 });
    if (existingJob.data?.state === "failed") {
      const retry = await admin.rpc("retry_provisioning_job", { p_job_id: existingJob.data.id, p_actor_user_id: resolved.user.id });
      if (retry.error || !retry.data) return provisioningRetryError(retry.error);
    } else if (existingJob.data?.state !== "queued" && existingJob.data?.state !== "retry_wait" && existingJob.data?.state !== "running") {
      return NextResponse.json({ deployment: existing.data }, { status: 202 });
    }
    void startQueuedWorker(existing.data.id, resolved.user.id);
    const refreshed = await admin.from("workspace_deployments").select(deploymentSelect).eq("id", existing.data.id).single();
    return NextResponse.json({ deployment: refreshed.data ?? existing.data }, { status: 202 });
  }

  const deploymentInsert = {
    customer_id: resolved.customerId,
    workspace_id: blueprint.workspace_id,
    workspace_blueprint_id: blueprint.id,
    blueprint_version: blueprint.version,
    compiler_version: compiled.compilerVersion,
    blueprint_schema_version: compiled.blueprintSchemaVersion,
    runtime_schema_version: compiled.compatibility.runtimeSchemaVersion,
    capability_registry_version: compiled.compatibility.capabilityRegistryVersion,
    blueprint_hash: compiled.source.blueprintHash,
    compiled_workspace_hash: compiled.compiledWorkspaceHash,
    provisioning_plan_hash: compiled.provisioningPlanHash,
    idempotency_key: compiled.idempotencyKey,
    compiled_workspace: compiled.compiledWorkspace,
    provisioning_plan: compiled.provisioningPlan,
    state: "queued",
    created_by: resolved.user.id,
    requested_by: resolved.user.id,
  };
  const deploymentResult = await admin.from("workspace_deployments").insert(deploymentInsert).select(deploymentSelect).single();
  if (deploymentResult.error || !deploymentResult.data) return NextResponse.json({ error: { code: "deployment_create_failed", message: "Unable to create the deployment" } }, { status: 500 });

  const deployment = deploymentResult.data;
  const jobResult = await admin.from("provisioning_jobs").insert({
    customer_id: resolved.customerId,
    workspace_id: blueprint.workspace_id,
    deployment_id: deployment.id,
    idempotency_key: compiled.idempotencyKey,
    state: "queued",
    requested_by: resolved.user.id,
  }).select("id").single();
  if (jobResult.error || !jobResult.data) return NextResponse.json({ error: { code: "provisioning_job_create_failed", message: "Unable to queue provisioning" } }, { status: 500 });

  const operations = compiled.provisioningPlan.operations.map((operation) => ({
    customer_id: resolved.customerId,
    workspace_id: blueprint.workspace_id,
    deployment_id: deployment.id,
    job_id: jobResult.data.id,
    operation_id: operation.operationId,
    kind: operation.kind,
    target_key: operation.targetKey,
    payload: operation.payload,
    depends_on: operation.dependsOn,
  }));
  const operationsResult = await admin.from("provisioning_operations").insert(operations);
  if (operationsResult.error) return NextResponse.json({ error: { code: "provisioning_operations_create_failed", message: "Unable to prepare provisioning" } }, { status: 500 });

  void startQueuedWorker(deployment.id, resolved.user.id);
  return NextResponse.json({ deployment }, { status: 202 });
}

export async function GET(_: Request, { params }: { params: Promise<{ blueprintId: string }> }) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;
  const parsed = blueprintIdSchema.safeParse((await params).blueprintId);
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_blueprint_id", message: "Invalid blueprint ID" } }, { status: 422 });
  const admin = createSupabaseAdminClient();
  const result = await admin.from("workspace_deployments").select(deploymentSelect).eq("workspace_blueprint_id", parsed.data).eq("customer_id", resolved.customerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) return NextResponse.json({ error: { code: "deployment_fetch_failed", message: "Unable to read deployment status" } }, { status: 500 });
  if (!result.data) return NextResponse.json({ deployment: null });
  const job = await admin.from("provisioning_jobs").select("id, state, last_error_code, last_error_message").eq("deployment_id", result.data.id).eq("customer_id", resolved.customerId).maybeSingle();
  return NextResponse.json({ deployment: result.data, job: job.data ?? null });
}

async function startQueuedWorker(deploymentId: string, actorUserId: string) {
  const workerIdentity = `northstar-web:${actorUserId}`;
  const claimed = await claimNextProvisioningJob(workerIdentity);
  if (!claimed || claimed.deployment_id !== deploymentId) return;
  await executeProvisioningJob(claimed.id, workerIdentity);
}

export function provisioningRetryError(error: { code?: string; message?: string } | null) {
  if (error?.code === "P0036" || error?.code === "P0038") return NextResponse.json({ error: { code: "invalid_retry_state", message: error.message ?? "Only failed provisioning jobs can be retried" } }, { status: 409 });
  if (error?.code === "42501") return NextResponse.json({ error: { code: "forbidden", message: "You are not authorized to retry this provisioning job" } }, { status: 403 });
  return NextResponse.json({ error: { code: error?.code ?? "provisioning_retry_failed", message: error?.message ?? "Unable to retry provisioning" } }, { status: 500 });
}
