import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { provisioningRetryError } from "@/app/api/v1/system-builder/blueprint/[blueprintId]/provision/route";

test("retry RPC only requeues failed jobs and preserves deployment operations", async () => {
  const sql = await readFile("supabase/migrations/0016_retry_provisioning_job.sql", "utf8");

  assert.match(sql, /create or replace function public\.retry_provisioning_job/);
  assert.match(sql, /job_row\.state <> 'failed'/);
  assert.match(sql, /set state = 'queued'/);
  assert.match(sql, /update public\.provisioning_operations/);
  assert.doesNotMatch(sql, /delete from public\.(workspace_deployments|provisioning_operations)/);
  assert.match(sql, /job_row\.idempotency_key/);
  assert.match(sql, /for update/);
  assert.match(sql, /provisioning_retry/);
});

test("retry route reuses the existing deployment and job", async () => {
  const source = await readFile("src/app/api/v1/system-builder/blueprint/[blueprintId]/provision/route.ts", "utf8");

  assert.match(source, /existingJob\.data\?\.state === "failed"/);
  assert.match(source, /retry_provisioning_job/);
  assert.match(source, /startQueuedWorker\(existing\.data\.id/);
  assert.doesNotMatch(source, /workspace_deployments.*delete/);
  assert.doesNotMatch(source, /provisioning_operations.*delete/);
});

test("failed provisioning presents a Retry Build action", async () => {
  const source = await readFile("src/app/components/CommandCanvas.tsx", "utf8");

  assert.match(source, /provisioningStatus === "failed" \? "Retry Build"/);
});

test("retry API preserves an unknown RPC error code and message", async () => {
  const response = provisioningRetryError({ code: "P0099", message: "retry diagnostic from database" });
  const body = await response.json() as { error: { code: string; message: string } };

  assert.equal(response.status, 500);
  assert.deepEqual(body.error, { code: "P0099", message: "retry diagnostic from database" });
});

test("ordinary failed to pending operation updates remain rejected", async () => {
  const sql = await readFile("supabase/migrations/0017_authorize_provisioning_operation_retry.sql", "utf8");

  assert.match(sql, /old\.state = 'failed'[\s\S]*new\.state = 'pending'/);
  assert.match(sql, /current_setting\('northstar\.retry_provisioning_job_id', true\) = old\.job_id::text/);
});

test("retry authorizes only the locked job and preserves completed operations", async () => {
  const sql = await readFile("supabase/migrations/0017_authorize_provisioning_operation_retry.sql", "utf8");

  assert.match(sql, /perform set_config\('northstar\.retry_provisioning_job_id', job_row\.id::text, true\)/);
  assert.match(sql, /where job_id = job_row\.id/);
  assert.match(sql, /and state <> 'succeeded'/);
  assert.match(sql, /job_row\.state <> 'failed'/);
  assert.match(sql, /for update/);
  assert.match(sql, /idempotencyKey', job_row\.idempotency_key/);
});