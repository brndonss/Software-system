import assert from "node:assert/strict";
import test from "node:test";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";
import { compileApprovedBlueprint } from "@/lib/system-builder/compiler";

const ids = { workspaceId: "00000000-0000-4000-8000-000000000031", blueprintId: "00000000-0000-4000-8000-000000000032" };
const base = {
  schemaVersion: 1,
  business: { summary: "Generic workflow system", vertical: "services", operationalFocus: "Move work forward" },
  entities: [{ key: "orders", label: "Orders", description: "Work records", fields: [{ key: "status", label: "Status", type: "text", required: true, unique: false }] }],
  relationships: [],
  workflows: [{ key: "lifecycle", name: "Lifecycle", description: "Move work", trigger: "record_created", triggerConfig: {}, steps: [
    { key: "create", type: "create_record", description: "Create work", entity: "orders", config: { entity: "orders" } },
    { key: "update", type: "update_record", description: "Update status", entity: "orders", config: { entity: "orders", field: "status", value: "complete" } },
  ] }],
  roles: [{ key: "operator", name: "Operator", description: "Operator", permissions: [{ action: "read", entity: "orders" }] }],
  views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
  automations: [], integrations: [],
  agent: { key: "agent", name: "Agent", persona: "Careful", mission: "Help", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: [], modelConfig: {}, escalationRules: ["Escalate"] },
  assumptions: [], clarificationNeeded: [],
};
function compile(blueprint: unknown) { return compileApprovedBlueprint({ ...ids, blueprintVersion: 1, blueprintStatus: "approved", validationStatus: "valid", blueprint }); }

test("accepts registered actions and preserves workflow step order", async () => {
  assert.equal(validateSystemBlueprint(base).ok, true);
  const result = await compile(base);
  const workflow = result.compiledWorkspace.workflows[0];
  assert.deepEqual(workflow.steps.map((step) => step.key), ["create", "update"]);
  assert.deepEqual(workflow.steps[1].config, { entity: "orders", field: "status", value: "complete" });
  const stepOps = result.provisioningPlan.operations.filter((operation) => operation.kind === "register_workflow_step");
  assert.deepEqual(stepOps.map((operation) => operation.targetKey), ["lifecycle.create", "lifecycle.update"]);
  assert.deepEqual(stepOps.map((operation) => operation.payload.key), ["create", "update"]);
});

test("rejects unknown actions and malformed action configurations", async () => {
  const unknown = structuredClone(base) as unknown as { workflows: Array<{ steps: Array<Record<string, unknown>> }> };
  unknown.workflows[0].steps[0].type = "run_code";
  unknown.workflows[0].steps[0].config = { code: "danger" };
  assert.equal(validateSystemBlueprint(unknown).ok, false);

  const malformed = structuredClone(base) as unknown as { workflows: Array<{ steps: Array<Record<string, unknown>> }> };
  malformed.workflows[0].steps[1].config = { entity: "orders", field: "status" };
  assert.equal(validateSystemBlueprint(malformed).ok, false);
  await assert.rejects(() => compile(malformed));
});

test("rejects invalid action entity and field references", () => {
  const missingEntity = structuredClone(base) as unknown as { workflows: Array<{ steps: Array<Record<string, unknown>> }> };
  missingEntity.workflows[0].steps[0].config = { entity: "missing" };
  assert.equal(validateSystemBlueprint(missingEntity).ok, false);

  const missingField = structuredClone(base) as unknown as { workflows: Array<{ steps: Array<Record<string, unknown>> }> };
  missingField.workflows[0].steps[1].config = { entity: "orders", field: "missing", value: "complete" };
  assert.equal(validateSystemBlueprint(missingField).ok, false);
});

test("validates explicit conditions declaratively", () => {
  const conditional = structuredClone(base) as unknown as { workflows: Array<{ steps: Array<Record<string, unknown>> }> };
  conditional.workflows[0].steps.push({ key: "branch", type: "condition", description: "Check status", entity: "orders", config: { entity: "orders", field: "status", operator: "equals", value: "complete" } });
  assert.equal(validateSystemBlueprint(conditional).ok, true);

  const invalidCondition = structuredClone(conditional);
  invalidCondition.workflows[0].steps[2].config = { entity: "orders", field: "status", operator: "equals" };
  assert.equal(validateSystemBlueprint(invalidCondition).ok, false);
});

test("compiles structurally different generic workflows without industry branching", async () => {
  for (const [vertical, entity, actionType, actionConfig] of [
    ["warehouse", "shipments", "create_record", { entity: "orders" }],
    ["restaurant", "reservations", "create_task", { entity: "orders", title: "Prepare service" }],
    ["construction", "projects", "update_record", { entity: "orders", field: "status", value: "complete" }],
    ["software", "tickets", "notify", { message: "Ticket updated" }],
  ] as const) {
    const blueprint = structuredClone(base) as unknown as typeof base;
    blueprint.business.vertical = vertical;
    blueprint.entities[0].key = entity;
    blueprint.views[0].entity = entity;
    blueprint.roles[0].permissions[0].entity = entity;
    blueprint.agent.allowedEntities = [entity];
    blueprint.agent.allowedActions[0].entity = entity;
    blueprint.workflows[0].steps[0].entity = entity;
    blueprint.workflows[0].steps[0].type = actionType as never;
    blueprint.workflows[0].steps[0].config = { ...actionConfig, ...(typeof actionConfig === "object" && "entity" in actionConfig ? { entity } : {}) } as never;
    blueprint.workflows[0].steps[1].entity = entity;
    blueprint.workflows[0].steps[1].config = { entity, field: "status", value: "complete" } as never;
    const result = await compile(blueprint);
    assert.equal(result.compiledWorkspace.entities[0].key, entity);
  }
});
