import assert from "node:assert/strict";
import test from "node:test";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";
import { compileApprovedBlueprint } from "@/lib/system-builder/compiler";

const ids = { workspaceId: "00000000-0000-4000-8000-000000000051", blueprintId: "00000000-0000-4000-8000-000000000052" };
const base = {
  schemaVersion: 1,
  business: { summary: "Integration system", vertical: "services", operationalFocus: "Coordinate work" },
  entities: [{ key: "orders", label: "Orders", description: "Orders", fields: [{ key: "status", label: "Status", type: "text", required: true, unique: false }] }],
  relationships: [],
  workflows: [{ key: "intake", name: "Intake", description: "Intake", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create", entity: "orders", config: { entity: "orders" } }] }],
  roles: [{ key: "operator", name: "Operator", description: "Operator", permissions: [{ action: "read", entity: "orders" }] }],
  views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
  automations: [], reports: [],
  integrations: [{ key: "mail", provider: "email", capability: "notification", purpose: "Send notifications", config: { fromAddress: "northstar@example.com" }, secretRef: "integrations.mail", enabled: true, references: [{ entity: "orders", field: "status" }] }],
  agent: { key: "agent", name: "Agent", persona: "Careful", mission: "Help", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: ["mail"], modelConfig: {}, escalationRules: ["Escalate"] },
  assumptions: [], clarificationNeeded: [],
};
function compile(blueprint: unknown) { return compileApprovedBlueprint({ ...ids, blueprintVersion: 1, blueprintStatus: "approved", validationStatus: "valid", blueprint }); }

test("compiles a valid registered integration without secrets", async () => {
  assert.equal(validateSystemBlueprint(base).ok, true);
  const result = await compile(base);
  const integration = result.compiledWorkspace.integrations[0];
  assert.equal(integration.secretRef, "integrations.mail");
  assert.equal((integration as unknown as { config: { fromAddress: string } }).config.fromAddress, "northstar@example.com");
  const operation = result.provisioningPlan.operations.find((item) => item.kind === "register_integration");
  assert.equal(operation?.payload.secret_ref, "integrations.mail");
  assert.ok(operation?.dependsOn.includes("register_field:orders.status"));
});

test("rejects unknown provider and malformed provider config", () => {
  const unknown = structuredClone(base);
  unknown.integrations[0].provider = "unknown_provider";
  assert.equal(validateSystemBlueprint(unknown).ok, false);

  const malformed = structuredClone(base);
  malformed.integrations[0].config = { fromAddress: "not-an-email" };
  assert.equal(validateSystemBlueprint(malformed).ok, false);
});

test("rejects secret-like fields and credential values", () => {
  const secretKey = structuredClone(base);
  secretKey.integrations[0].config = { apiKey: "do-not-store" } as never;
  assert.equal(validateSystemBlueprint(secretKey).ok, false);

  const secretValue = structuredClone(base);
  secretValue.integrations[0].config = { fromAddress: "northstar@example.com", password: "secret" } as never;
  assert.equal(validateSystemBlueprint(secretValue).ok, false);
});

test("accepts secret_ref metadata but rejects invalid references", () => {
  const valid = structuredClone(base);
  valid.integrations[0].secretRef = "vault/northstar/mail";
  assert.equal(validateSystemBlueprint(valid).ok, true);

  const invalidEntity = structuredClone(base);
  invalidEntity.integrations[0].references = [{ entity: "missing" } as never];
  assert.equal(validateSystemBlueprint(invalidEntity).ok, false);

  const invalidField = structuredClone(base);
  invalidField.integrations[0].references = [{ entity: "orders", field: "missing" }];
  assert.equal(validateSystemBlueprint(invalidField).ok, false);
});

test("keeps integration metadata hash deterministic", async () => {
  const first = await compile(base);
  const reordered = structuredClone(base);
  reordered.integrations[0].references.reverse();
  const second = await compile(reordered);
  assert.equal(first.source.blueprintHash, second.source.blueprintHash);
  assert.equal(first.provisioningPlanHash, second.provisioningPlanHash);
});

test("compiles multiple generic integration examples without industry branching", async () => {
  for (const [provider, capability, config] of ([
    ["email", "notification", { fromAddress: "northstar@example.com" }],
    ["calendar", "calendar", { calendarName: "Operations" }],
    ["analytics", "reports", { datasetKey: "operations" }],
  ] as const)) {
    const blueprint = structuredClone(base);
    blueprint.integrations[0].provider = provider;
    blueprint.integrations[0].capability = capability;
    blueprint.integrations[0].config = config as never;
    const result = await compile(blueprint);
    assert.equal(result.compiledWorkspace.integrations[0].provider, provider);
  }
});
