import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = "src/app/api/v1/system-builder/blueprint/[blueprintId]/provision/route.ts";

test("provisioning is approval-gated and uses the existing compiler and worker", async () => {
  const route = await readFile(routePath, "utf8");

  assert.match(route, /blueprint\.status !== "approved"/);
  assert.match(route, /compileApprovedBlueprint/);
  assert.match(route, /provisioning_jobs/);
  assert.match(route, /provisioning_operations/);
  assert.match(route, /claimNextProvisioningJob/);
  assert.match(route, /executeProvisioningJob/);
});

test("provisioning exposes durable deployment status for polling", async () => {
  const route = await readFile(routePath, "utf8");

  assert.match(route, /export async function GET/);
  assert.match(route, /state/);
  assert.match(route, /ready/);
  assert.match(route, /error_message/);
});