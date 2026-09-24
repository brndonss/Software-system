import assert from "node:assert/strict";
import test from "node:test";
import { assertSupportedCompatibility, buildIdempotencyKey, compileApprovedBlueprint, currentCompatibility, sha256 } from "@/lib/system-builder/compiler";

const blueprint = {
  schemaVersion: 1,
  business: { summary: "Compatibility system", vertical: "services", operationalFocus: "Run work" },
  entities: [{ key: "orders", label: "Orders", description: "Orders", fields: [{ key: "status", label: "Status", type: "text", required: true, unique: false }] }],
  relationships: [],
  workflows: [{ key: "intake", name: "Intake", description: "Intake", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create", entity: "orders", config: { entity: "orders" } }] }],
  roles: [{ key: "operator", name: "Operator", description: "Operator", permissions: [{ action: "read", entity: "orders" }] }],
  views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
  automations: [], reports: [], integrations: [],
  agent: { key: "agent", name: "Agent", persona: "Careful", mission: "Help", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: [], modelConfig: {}, escalationRules: ["Escalate"] },
  assumptions: [], clarificationNeeded: [],
};
const input = { workspaceId: "00000000-0000-4000-8000-000000000071", blueprintId: "00000000-0000-4000-8000-000000000072", blueprintVersion: 1, blueprintStatus: "approved", validationStatus: "valid", blueprint };

test("compiled workspace and plan expose deterministic supported compatibility metadata", async () => {
  const result = await compileApprovedBlueprint(input);
  assert.deepEqual(result.compatibility, currentCompatibility);
  assert.deepEqual(result.compiledWorkspace.compatibility, currentCompatibility);
  assert.deepEqual(result.provisioningPlan.compatibility, currentCompatibility);
  assertSupportedCompatibility(result.compatibility);
});

test("rejects unsupported compatibility versions", () => {
  assert.throws(() => assertSupportedCompatibility({ ...currentCompatibility, runtimeSchemaVersion: 2 }), /Unsupported runtimeSchemaVersion/);
  assert.throws(() => assertSupportedCompatibility({ ...currentCompatibility, blueprintSchemaVersion: 2 }), /Unsupported blueprintSchemaVersion/);
  assert.throws(() => assertSupportedCompatibility({ ...currentCompatibility, capabilityRegistryVersion: "2" }), /Unsupported capabilityRegistryVersion/);
  assert.throws(() => assertSupportedCompatibility({ ...currentCompatibility, compilerVersion: 2 }), /Unsupported compilerVersion/);
});

test("blueprint schema incompatibility fails closed", async () => {
  await assert.rejects(() => compileApprovedBlueprint({ ...input, blueprint: { ...blueprint, schemaVersion: 2 } }), /Invalid input/);
});

test("compatibility changes produce different hashes and idempotency identities", () => {
  const first = sha256(currentCompatibility);
  const secondCompatibility = { ...currentCompatibility, runtimeSchemaVersion: currentCompatibility.runtimeSchemaVersion + 1 };
  assert.notEqual(first, sha256(secondCompatibility));
  const firstKey = buildIdempotencyKey({ workspaceId: input.workspaceId, blueprintId: input.blueprintId, blueprintVersion: 1, compilerVersion: currentCompatibility.compilerVersion, blueprintHash: "sha256-a", compatibilityHash: first });
  const secondKey = buildIdempotencyKey({ workspaceId: input.workspaceId, blueprintId: input.blueprintId, blueprintVersion: 1, compilerVersion: currentCompatibility.compilerVersion, blueprintHash: "sha256-a", compatibilityHash: sha256(secondCompatibility) });
  assert.notEqual(firstKey, secondKey);
});

test("future worker can compare exact compatibility metadata without inference", () => {
  const runtime = { ...currentCompatibility };
  assert.deepEqual(assertSupportedCompatibility(runtime), runtime);
});
