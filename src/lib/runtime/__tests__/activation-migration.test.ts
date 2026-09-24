import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("activation migration locks workspace and atomically replaces the active pointer", async () => {
  const sql = await readFile("supabase/migrations/0013_deployment_activation.sql", "utf8");
  assert.match(sql, /create or replace function public\.activate_workspace_deployment/);
  assert.match(sql, /from public\.workspaces[\s\S]*for update/);
  assert.match(sql, /on conflict \(workspace_id\) do update/);
  assert.match(sql, /update public\.workspaces[\s\S]*set status = 'active'/);
  assert.match(sql, /deployment_activation/);
  assert.doesNotMatch(sql, /state = 'active'/);
});

test("activation migration enforces readiness, approval, validation, provisioning, and compatibility", async () => {
  const sql = await readFile("supabase/migrations/0013_deployment_activation.sql", "utf8");
  for (const phrase of ["blueprint is not approved", "blueprint validation is invalid", "deployment is not ready", "deployment is archived", "deployment compatibility is unsupported", "provisioning job is not complete", "provisioning operations are incomplete"]) assert.match(sql, new RegExp(phrase));
  assert.match(sql, /grant execute on function public\.activate_workspace_deployment\(uuid, uuid\) to service_role/);
  assert.doesNotMatch(sql, /to authenticated/);
});

test("activation route requires authenticated server-side resolution and does not accept customer IDs", async () => {
  const route = await readFile("src/app/api/v1/runtime/deployments/[deploymentId]/activate/route.ts", "utf8");
  assert.match(route, /resolveCustomerIdFromSession/);
  assert.match(route, /activateDeployment/);
  assert.doesNotMatch(route, /customerId.*request|body.*customerId/);
});
