import assert from "node:assert/strict";
import test from "node:test";
import { compileApprovedBlueprint, BlueprintCompilerError } from "@/lib/system-builder/compiler";

const ids = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  blueprintId: "00000000-0000-4000-8000-000000000002",
};

const blueprint = {
  schemaVersion: 1,
  business: { summary: "Operations system", vertical: "services", operationalFocus: "Coordinate work" },
  entities: [
    { key: "customers", label: "Customers", description: "People served", fields: [{ key: "name", label: "Name", type: "text", required: true, unique: false }] },
    { key: "orders", label: "Orders", description: "Requests", fields: [{ key: "customer", label: "Customer", type: "text", required: true, unique: false, referenceEntity: "customers", relationshipType: "many-to-one" as never }] },
  ],
  relationships: [{ fromEntity: "customers", toEntity: "orders", relationshipType: "one-to-many", label: "Customer orders" }],
  workflows: [{ key: "intake", name: "Intake", description: "Handle requests", trigger: "manual", triggerConfig: {}, steps: [{ key: "create_order", type: "create_record", description: "Create order", entity: "orders", config: { entity: "orders" } }, { key: "assign", type: "assign", description: "Assign owner", entity: "orders", config: { entity: "orders" } }] }],
  roles: [{ key: "owner", name: "Owner", description: "Owns work", permissions: [{ action: "read", entity: "orders" }, { action: "approve", entity: "orders" }] }],
  views: [{ key: "orders_table", name: "Orders", entity: "orders", type: "table" }],
  automations: [{ key: "notify_order", trigger: "record_created", actions: ["notify"], conditions: ["order needs review"] }],
  integrations: [{ key: "email_notifications", provider: "email", capability: "notification", purpose: "Send updates" }],
  agent: { key: "coordinator", name: "Coordinator", persona: "Careful", mission: "Keep work moving", responsibilities: ["Review work"], guardrails: ["Respect permissions"], allowedTools: ["search_records"], allowedEntities: ["customers", "orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: ["email_notifications"], modelConfig: {}, escalationRules: ["Escalate uncertainty"] },
  assumptions: [],
  clarificationNeeded: [],
};

function input(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: ids.workspaceId,
    blueprintId: ids.blueprintId,
    blueprintVersion: 4,
    blueprintStatus: "approved",
    validationStatus: "valid",
    blueprint,
    ...overrides,
  };
}

test("compiles an approved validated blueprint into canonical workspace and plan", async () => {
  const result = await compileApprovedBlueprint(input());

  assert.equal(result.compilerVersion, 1);
  assert.equal(result.source.blueprintVersion, 4);
  assert.equal(result.compiledWorkspace.entities[0].key, "customers");
  assert.equal(result.provisioningPlan.operations[0].kind, "register_entity");
  assert.equal(result.provisioningPlan.operations[1].kind, "register_field");
  assert.equal(result.provisioningPlan.operations[1].dependsOn[0], "register_entity:customers");
  assert.match(result.source.blueprintHash, /^sha256-[a-f0-9]{64}$/);
  assert.match(result.compiledWorkspaceHash, /^sha256-[a-f0-9]{64}$/);
  assert.match(result.provisioningPlanHash, /^sha256-[a-f0-9]{64}$/);
});

test("is deterministic across input ordering and harmless whitespace", async () => {
  const first = await compileApprovedBlueprint(input());
  const reordered = structuredClone(blueprint);
  reordered.entities.reverse();
  reordered.entities[0].label = ` ${reordered.entities[0].label} `;
  reordered.roles[0].permissions.reverse();
  const second = await compileApprovedBlueprint(input({ blueprint: reordered }));

  assert.equal(second.source.blueprintHash, first.source.blueprintHash);
  assert.equal(second.compiledWorkspaceHash, first.compiledWorkspaceHash);
  assert.equal(second.provisioningPlanHash, first.provisioningPlanHash);
  assert.equal(second.idempotencyKey, first.idempotencyKey);
});

test("changes hashes when blueprint version or compiler input changes", async () => {
  const first = await compileApprovedBlueprint(input());
  const second = await compileApprovedBlueprint(input({ blueprintVersion: 5 }));
  const third = await compileApprovedBlueprint(input({ blueprint: { ...blueprint, business: { ...blueprint.business, summary: "Different system" } } }));

  assert.notEqual(second.idempotencyKey, first.idempotencyKey);
  assert.equal(second.source.blueprintHash, first.source.blueprintHash);
  assert.notEqual(third.source.blueprintHash, first.source.blueprintHash);
});

test("rejects unapproved and unvalidated inputs", async () => {
  await assert.rejects(() => compileApprovedBlueprint(input({ blueprintStatus: "in_review" })), /Invalid input/);
  await assert.rejects(() => compileApprovedBlueprint(input({ validationStatus: "unvalidated" })), /Invalid input/);
});

test("rejects missing references and duplicate keys", async () => {
  const missingReference = structuredClone(blueprint);
  missingReference.views[0].entity = "missing";
  await assert.rejects(() => compileApprovedBlueprint(input({ blueprint: missingReference })), BlueprintCompilerError);

  const duplicateKeys = structuredClone(blueprint);
  duplicateKeys.entities.push({ ...duplicateKeys.entities[0] });
  await assert.rejects(() => compileApprovedBlueprint(input({ blueprint: duplicateKeys })), BlueprintCompilerError);
});

test("rejects unsupported capabilities", async () => {
  const unsupported = structuredClone(blueprint) as unknown as { integrations: Array<Record<string, unknown>> };
  unsupported.integrations[0].capability = "unsupported_runtime_action";
  await assert.rejects(() => compileApprovedBlueprint(input({ blueprint: unsupported })), BlueprintCompilerError);
});

test("rejects clarification-required blueprints", async () => {
  const incomplete = structuredClone(blueprint) as unknown as { clarificationNeeded: string[] };
  incomplete.clarificationNeeded = ["Need a critical workflow decision"];
  await assert.rejects(() => compileApprovedBlueprint(input({ blueprint: incomplete })), BlueprintCompilerError);
});

test("uses stable operation IDs and dependency ordering", async () => {
  const result = await compileApprovedBlueprint(input());
  const ids = result.provisioningPlan.operations.map((operation) => operation.operationId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.indexOf("register_entity:orders") < ids.indexOf("register_field:orders.customer"));
  assert.ok(ids.indexOf("register_workflow:intake") < ids.indexOf("register_workflow_step:intake.create_order"));
  assert.ok(ids.indexOf("register_role:owner") < ids.indexOf("register_permission:owner.read.orders.*"));
});

test("has no database, auth, or network side effects", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network call"); };
  try {
    const result = await compileApprovedBlueprint(input());
    assert.equal(result.provisioningPlan.operations.some((operation) => operation.kind === "register_entity"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("produces structurally different outputs without industry branching", async () => {
  const service = await compileApprovedBlueprint(input());
  const different = await compileApprovedBlueprint(input({
    blueprint: {
      ...blueprint,
      business: { summary: "Production system", vertical: "manufacturing", operationalFocus: "Track production" },
      entities: [{ key: "batches", label: "Batches", description: "Production batches", fields: [{ key: "quantity", label: "Quantity", type: "number", required: true, unique: false }] }],
      roles: [{ ...blueprint.roles[0], permissions: [{ action: "read", entity: "batches" }] }],
      agent: { ...blueprint.agent, allowedEntities: ["batches"], allowedActions: [{ action: "read", entity: "batches" }] },
      relationships: [],
      workflows: [{ key: "production", name: "Production", description: "Track production", trigger: "record_created", triggerConfig: {}, steps: [{ key: "update", type: "update_record", description: "Update batch", entity: "batches", config: { entity: "batches", field: "quantity", value: 0 } }] }],
      views: [{ key: "batch_board", name: "Batches", entity: "batches", type: "kanban" }],
    },
  }));

  assert.notDeepEqual(service.compiledWorkspace.entities.map((entity) => entity.key), different.compiledWorkspace.entities.map((entity) => entity.key));
  assert.notEqual(service.compiledWorkspaceHash, different.compiledWorkspaceHash);
});
