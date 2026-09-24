import assert from "node:assert/strict";
import test from "node:test";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";
import { compileApprovedBlueprint, BlueprintCompilerError } from "@/lib/system-builder/compiler";

const ids = {
  workspaceId: "00000000-0000-4000-8000-000000000011",
  blueprintId: "00000000-0000-4000-8000-000000000012",
};

const baseBlueprint = {
  schemaVersion: 1,
  business: { summary: "Permission test", vertical: "services", operationalFocus: "Run work" },
  entities: [
    { key: "orders", label: "Orders", description: "Work orders", fields: [{ key: "status", label: "Status", type: "text", required: true, unique: false }] },
    { key: "customers", label: "Customers", description: "Customers", fields: [{ key: "name", label: "Name", type: "text", required: true, unique: false }] },
  ],
  relationships: [],
  workflows: [{ key: "intake", name: "Intake", description: "Intake", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create order", entity: "orders", config: { entity: "orders" } }] }],
  roles: [{ key: "operator", name: "Operator", description: "Operator", permissions: [{ action: "read", entity: "orders" }] }],
  views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
  automations: [],
  integrations: [],
  agent: { key: "agent", name: "Agent", persona: "Careful", mission: "Help", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: [], modelConfig: {}, escalationRules: ["Escalate"] },
  assumptions: [],
  clarificationNeeded: [],
};

function compileInput(blueprint: unknown) {
  return compileApprovedBlueprint({ ...ids, blueprintVersion: 1, blueprintStatus: "approved", validationStatus: "valid", blueprint });
}

test("accepts entity-scoped and field-scoped permissions", async () => {
  const blueprint = structuredClone(baseBlueprint);
  blueprint.roles[0].permissions = [
    { action: "read", entity: "orders" },
    { action: "update", entity: "orders", field: "status" } as never,
  ];
  assert.equal(validateSystemBlueprint(blueprint).ok, true);
  const result = await compileInput(blueprint);
  assert.deepEqual(result.compiledWorkspace.roles[0].permissions, blueprint.roles[0].permissions);
  assert.ok(result.provisioningPlan.operations.some((operation) => operation.operationId.includes("update.orders.status")));
});

test("rejects missing and unknown permission entity targets", async () => {
  const missing = structuredClone(baseBlueprint);
  missing.roles[0].permissions = [{ action: "read", entity: "" } as never];
  assert.equal(validateSystemBlueprint(missing).ok, false);
  await assert.rejects(() => compileInput(missing));

  const unknown = structuredClone(baseBlueprint);
  unknown.roles[0].permissions = [{ action: "read", entity: "invoices" }];
  assert.equal(validateSystemBlueprint(unknown).ok, false);
  await assert.rejects(() => compileInput(unknown), BlueprintCompilerError);
});

test("rejects unknown, cross-entity, and duplicate field targets", async () => {
  const unknownField = structuredClone(baseBlueprint);
  unknownField.roles[0].permissions = [{ action: "update", entity: "orders", field: "missing" } as never];
  assert.equal(validateSystemBlueprint(unknownField).ok, false);

  const crossEntity = structuredClone(baseBlueprint);
  crossEntity.roles[0].permissions = [{ action: "update", entity: "orders", field: "name" } as never];
  assert.equal(validateSystemBlueprint(crossEntity).ok, false);

  const duplicate = structuredClone(baseBlueprint);
  duplicate.roles[0].permissions = [{ action: "read", entity: "orders" }, { action: "read", entity: "orders" }];
  assert.equal(validateSystemBlueprint(duplicate).ok, false);
});

test("rejects unsupported permission actions instead of silently compiling them", async () => {
  const unsupported = structuredClone(baseBlueprint);
  unsupported.roles[0].permissions = [{ action: "manage_everything", entity: "orders" } as never];
  assert.equal(validateSystemBlueprint(unsupported).ok, false);
  await assert.rejects(() => compileInput(unsupported));
});

test("permission compilation remains deterministic", async () => {
  const first = structuredClone(baseBlueprint);
  first.roles[0].permissions = [
    { action: "update", entity: "orders", field: "status" } as never,
    { action: "read", entity: "orders" },
  ];
  const second = structuredClone(first);
  second.roles[0].permissions.reverse();
  const one = await compileInput(first);
  const two = await compileInput(second);
  assert.equal(one.source.blueprintHash, two.source.blueprintHash);
  assert.equal(one.provisioningPlanHash, two.provisioningPlanHash);
});
