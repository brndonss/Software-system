import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0011_provisioning_state.sql";
const requiredTables = ["provisioning_jobs", "provisioning_operations", "provisioning_attempts", "runtime_operation_log"];

test("Phase 3C migration defines durable provisioning state tables and required columns", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  for (const column of ["idempotency_key", "lease_owner", "lease_token", "lease_expires_at", "available_at", "attempt_count", "completed_at"]) assert.match(sql, new RegExp(`\\b${column}\\b`));
  assert.match(sql, /unique \(workspace_id, idempotency_key\)/);
  assert.match(sql, /unique \(job_id, operation_id\)/);
  assert.match(sql, /unique \(job_id, operation_id\)/);
  assert.match(sql, /unique \(id, job_id, deployment_id, workspace_id, customer_id\)/);
});

test("Phase 3C migration stores compatibility and immutable artifacts on deployments", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const column of ["blueprint_schema_version", "runtime_schema_version", "capability_registry_version", "blueprint_hash", "compiled_workspace_hash", "provisioning_plan_hash", "compiled_workspace", "provisioning_plan", "idempotency_key", "ready_at"]) assert.match(sql, new RegExp(`\\b${column}\\b`));
  assert.match(sql, /state in \('draft', 'queued', 'provisioning', 'ready', 'failed', 'archived'\)/);
  assert.doesNotMatch(sql, /state in \([^)]*'active'/);
  assert.match(sql, /queued deployment artifacts are immutable/);
});

test("Phase 3C migration defines legal state transition guards and no client write policies", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /guard_workspace_deployment_transition/);
  assert.match(sql, /guard_provisioning_job_transition/);
  assert.match(sql, /guard_provisioning_operation_transition/);
  assert.doesNotMatch(sql, /create policy "Owners can create provisioning/);
  assert.doesNotMatch(sql, /create policy "Owners can update provisioning/);
  assert.doesNotMatch(sql, /create policy "Owners can delete provisioning/);
});

test("Phase 3C migration uses composite workspace/customer/deployment integrity", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /foreign key \(deployment_id, workspace_id, customer_id\)\s+references public\.workspace_deployments/);
  assert.match(sql, /foreign key \(job_id, deployment_id, workspace_id, customer_id\)\s+references public\.provisioning_jobs/);
  assert.match(sql, /foreign key \(operation_id, job_id, deployment_id, workspace_id, customer_id\)\s+references public\.provisioning_operations/);
  assert.doesNotMatch(sql, /api[_-]?key|password|access[_-]?token|refresh[_-]?token|private[_-]?key/i);
});

test("Phase 3D migration defines trusted claim, lease, completion, and failure functions", async () => {
  const sql = await readFile("supabase/migrations/0012_provisioning_worker_functions.sql", "utf8");
  for (const name of ["claim_provisioning_job", "heartbeat_provisioning_job", "claim_provisioning_operation", "heartbeat_provisioning_operation", "complete_provisioning_operation", "fail_provisioning_operation", "complete_provisioning_job", "fail_provisioning_job"]) assert.match(sql, new RegExp(`create or replace function public\\.${name}`));
  assert.match(sql, /grant execute on function public\.claim_provisioning_job[\s\S]*to service_role/);
  assert.doesNotMatch(sql, /to authenticated/);
});

test("Phase 3D migration uses locking, leases, dependency readiness, and no client write policies", async () => {
  const sql = await readFile("supabase/migrations/0012_provisioning_worker_functions.sql", "utf8");
  assert.match(sql, /for update skip locked/);
  assert.match(sql, /lease_expires_at/);
  assert.match(sql, /jsonb_array_elements_text\(operation\.depends_on\)/);
  assert.doesNotMatch(sql, /create policy "Owners can create provisioning/);
  assert.doesNotMatch(sql, /create policy "Owners can update provisioning/);
});
