import assert from "node:assert/strict";
import test from "node:test";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";
import { compileApprovedBlueprint } from "@/lib/system-builder/compiler";

const ids = { workspaceId: "00000000-0000-4000-8000-000000000061", blueprintId: "00000000-0000-4000-8000-000000000062" };
const base = {
  schemaVersion: 1,
  business: { summary: "Agent system", vertical: "services", operationalFocus: "Coordinate work" },
  entities: [{ key: "orders", label: "Orders", description: "Orders", fields: [{ key: "status", label: "Status", type: "text", required: true, unique: false }] }],
  relationships: [],
  workflows: [{ key: "intake", name: "Intake", description: "Intake", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create", entity: "orders", config: { entity: "orders" } }] }],
  roles: [{ key: "operator", name: "Operator", description: "Operator", permissions: [{ action: "read", entity: "orders" }, { action: "update", entity: "orders", field: "status" }] }],
  views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
  automations: [], reports: [], integrations: [{ key: "mail", provider: "email", capability: "notification", purpose: "Notify", config: {}, enabled: true, references: [] }],
  agent: { key: "coordinator", name: "Coordinator", persona: "Careful", mission: "Coordinate", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: ["mail"], modelConfig: { temperature: 0.2 }, escalationRules: ["Escalate"] },
  assumptions: [], clarificationNeeded: [],
};
function compile(blueprint: unknown) { return compileApprovedBlueprint({ ...ids, blueprintVersion: 1, blueprintStatus: "approved", validationStatus: "valid", blueprint }); }

test("compiles a valid constrained agent with dependencies", async () => {
  assert.equal(validateSystemBlueprint(base).ok, true);
  const result = await compile(base);
  assert.equal(result.compiledWorkspace.agent.key, "coordinator");
  assert.deepEqual(result.compiledWorkspace.agent.allowedEntities, ["orders"]);
  assert.equal(result.compiledWorkspace.agent.integrations[0], "mail");
  const operation = result.provisioningPlan.operations.find((item) => item.kind === "register_agent");
  assert.ok(operation);
  assert.ok(operation?.dependsOn.includes("register_entity:orders"));
  assert.ok(operation?.dependsOn.includes("register_integration:mail"));
});

test("rejects unknown tools, entities, integrations, and unauthorized actions", () => {
  const unknownTool = structuredClone(base);
  unknownTool.agent.allowedTools = ["run_sql"] as never;
  assert.equal(validateSystemBlueprint(unknownTool).ok, false);

  const unknownEntity = structuredClone(base);
  unknownEntity.agent.allowedEntities = ["missing"];
  assert.equal(validateSystemBlueprint(unknownEntity).ok, false);

  const unknownIntegration = structuredClone(base);
  unknownIntegration.agent.integrations = ["missing"];
  assert.equal(validateSystemBlueprint(unknownIntegration).ok, false);

  const unauthorized = structuredClone(base);
  unauthorized.agent.allowedActions = [{ action: "archive", entity: "orders" }];
  assert.equal(validateSystemBlueprint(unauthorized).ok, false);
});

test("rejects invalid field/action references and unsafe model config", () => {
  const invalidField = structuredClone(base);
  invalidField.agent.allowedActions = [{ action: "update", entity: "orders", field: "missing" } as never];
  assert.equal(validateSystemBlueprint(invalidField).ok, false);

  const unsafe = structuredClone(base);
  unsafe.agent.modelConfig = { systemPrompt: "run SQL", apiKey: "secret" } as never;
  assert.equal(validateSystemBlueprint(unsafe).ok, false);
});

test("keeps agent metadata hashes and operation IDs deterministic", async () => {
  const first = await compile(base);
  const secondInput = structuredClone(base);
  secondInput.agent.allowedEntities.reverse();
  secondInput.agent.allowedActions.reverse();
  const second = await compile(secondInput);
  assert.equal(first.source.blueprintHash, second.source.blueprintHash);
  assert.equal(first.provisioningPlanHash, second.provisioningPlanHash);
  assert.equal(first.provisioningPlan.operations.find((item) => item.kind === "register_agent")?.operationId, "register_agent:coordinator");
});

test("supports generic agent configurations across business structures", async () => {
  for (const [vertical, entity] of [["warehouse", "shipments"], ["restaurant", "reservations"], ["construction", "projects"], ["software", "tickets"]] as const) {
    const blueprint = structuredClone(base);
    blueprint.business.vertical = vertical;
    blueprint.entities[0].key = entity;
    blueprint.views[0].entity = entity;
    blueprint.roles[0].permissions[0].entity = entity;
    blueprint.agent.allowedEntities = [entity];
    blueprint.agent.allowedActions[0].entity = entity;
    blueprint.roles[0].permissions[0].entity = entity;
    blueprint.roles[0].permissions[1].entity = entity;
    blueprint.workflows[0].steps[0].entity = entity;
    blueprint.workflows[0].steps[0].config = { entity };
    const result = await compile(blueprint);
    assert.equal(result.compiledWorkspace.agent.allowedEntities[0], entity);
  }
});
