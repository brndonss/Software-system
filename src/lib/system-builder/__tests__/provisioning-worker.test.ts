import assert from "node:assert/strict";
import test from "node:test";
import { hasDependencyCycle, ProvisioningWorkerError, workflowStepOrdinal } from "@/lib/system-builder/provisioning/worker";
import { compileApprovedBlueprint } from "@/lib/system-builder/compiler";

test("detects dependency cycles without database access", () => {
  assert.equal(hasDependencyCycle([
    { operationId: "a", dependsOn: ["b"] },
    { operationId: "b", dependsOn: ["a"] },
  ]), true);
  assert.equal(hasDependencyCycle([
    { operationId: "a", dependsOn: [] },
    { operationId: "b", dependsOn: ["a"] },
  ]), false);
});

test("worker errors expose stable non-retryable classifications", () => {
  const error = new ProvisioningWorkerError("artifact_mismatch", "Stored artifact differs from deterministic compilation");
  assert.equal(error.retryable, false);
  assert.equal(error.code, "artifact_mismatch");
});

test("permission provisioning waits for the exact scoped entity operation", async () => {
  const result = await compileApprovedBlueprint({
    workspaceId: "00000000-0000-4000-8000-000000000011",
    blueprintId: "00000000-0000-4000-8000-000000000012",
    blueprintVersion: 1,
    blueprintStatus: "approved",
    validationStatus: "valid",
    blueprint: {
      schemaVersion: 1,
      business: { summary: "Scoped permission test", vertical: "services", operationalFocus: "Run work" },
      entities: [{ key: "orders", label: "Orders", description: "Orders", fields: [{ key: "status", label: "Status", type: "text", required: true, unique: false }] }],
      relationships: [],
      workflows: [{ key: "intake", name: "Intake", description: "Create orders", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create order", entity: "orders", config: { entity: "orders" } }] }],
      roles: [{ key: "operator", name: "Operator", description: "Runs work", permissions: [{ action: "read", entity: "orders" }] }],
      views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
      automations: [], integrations: [], reports: [],
      agent: { key: "agent", name: "Agent", persona: "Careful", mission: "Help", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: [], modelConfig: {}, escalationRules: ["Escalate"] },
      assumptions: [], clarificationNeeded: [],
    },
  });
  const entityOperation = result.provisioningPlan.operations.find((operation) => operation.operationId === "register_entity:orders");
  const permissionOperation = result.provisioningPlan.operations.find((operation) => operation.operationId === "register_permission:operator.read.orders.*");
  assert.ok(entityOperation);
  assert.ok(permissionOperation);
  assert.deepEqual(permissionOperation.dependsOn, ["register_role:operator", "register_entity:orders"]);
  assert.ok(result.provisioningPlan.operations.indexOf(entityOperation) < result.provisioningPlan.operations.indexOf(permissionOperation));
});

test("workflow step ordinals follow compiled order and remain deterministic on retry", () => {
  const workspace = {
    workflows: [{ key: "core", steps: [
      { key: "first" },
      { key: "second" },
    ] }],
  } as never;

  assert.equal(workflowStepOrdinal(workspace, "core", "first"), 0);
  assert.equal(workflowStepOrdinal(workspace, "core", "second"), 1);
  assert.equal(workflowStepOrdinal(workspace, "core", "second"), 1);
});
