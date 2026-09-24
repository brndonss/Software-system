import assert from "node:assert/strict";
import test from "node:test";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";
import { compileApprovedBlueprint } from "@/lib/system-builder/compiler";

const ids = { workspaceId: "00000000-0000-4000-8000-000000000021", blueprintId: "00000000-0000-4000-8000-000000000022" };
const base = {
  schemaVersion: 1,
  business: { summary: "Field system", vertical: "services", operationalFocus: "Validate records" },
  entities: [{ key: "orders", label: "Orders", description: "Orders", fields: [{ key: "name", label: "Name", type: "text", required: true, unique: false }] }],
  relationships: [],
  workflows: [{ key: "intake", name: "Intake", description: "Intake", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create", entity: "orders", config: { entity: "orders" } }] }],
  roles: [{ key: "operator", name: "Operator", description: "Operator", permissions: [{ action: "read", entity: "orders" }] }],
  views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
  automations: [],
  integrations: [],
  agent: { key: "agent", name: "Agent", persona: "Careful", mission: "Validate", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: [], modelConfig: {}, escalationRules: ["Escalate"] },
  assumptions: [], clarificationNeeded: [],
};

function withField(field: Record<string, unknown>) {
  return { ...base, entities: [{ ...base.entities[0], fields: [{ ...base.entities[0].fields[0], ...field }] }] };
}
function compile(blueprint: unknown) {
  return compileApprovedBlueprint({ ...ids, blueprintVersion: 1, blueprintStatus: "approved", validationStatus: "valid", blueprint });
}

test("accepts supported field types and required/nullable/default metadata", async () => {
  for (const type of ["text", "number", "date", "boolean", "select", "currency", "email", "textarea"]) {
    const field = type === "select" ? { type, options: ["new", "done"], defaultValue: "new" } : { type, defaultValue: type === "number" || type === "currency" ? 0 : type === "boolean" ? false : type === "date" ? "2026-01-01" : "value" };
    const result = validateSystemBlueprint(withField({ ...field, required: false, nullable: true }));
    assert.equal(result.ok, true, type);
    const compiled = await compile(withField({ ...field, required: false, nullable: true }));
    const compiledField = compiled.compiledWorkspace.entities[0].fields[0];
    assert.equal(compiledField.nullable, true);
    assert.deepEqual(compiledField.defaultValue, field.defaultValue);
  }
});

test("accepts declarative validation and relationship metadata", async () => {
  const blueprint = withField({ type: "text", validation: { minLength: 2, maxLength: 40, pattern: "^[A-Z]" }, referenceEntity: "orders", relationshipType: "one-to-one" });
  assert.equal(validateSystemBlueprint(blueprint).ok, true);
  const result = await compile(blueprint);
  assert.deepEqual(result.compiledWorkspace.entities[0].fields[0].validation, { minLength: 2, maxLength: 40, pattern: "^[A-Z]" });
  assert.equal(result.compiledWorkspace.entities[0].fields[0].relationshipType, "one-to-one");
});

test("rejects malformed validation ranges, patterns, and allowed values", () => {
  assert.equal(validateSystemBlueprint(withField({ validation: { minLength: 10, maxLength: 2 } })).ok, false);
  assert.equal(validateSystemBlueprint(withField({ validation: { pattern: "[" } })).ok, false);
  assert.equal(validateSystemBlueprint(withField({ type: "text", options: ["a", "a"] })).ok, false);
  assert.equal(validateSystemBlueprint(withField({ type: "select" })).ok, false);
});

test("rejects invalid defaults and relationship metadata", () => {
  assert.equal(validateSystemBlueprint(withField({ type: "number", defaultValue: "not-a-number" })).ok, false);
  assert.equal(validateSystemBlueprint(withField({ type: "select", options: ["new"], defaultValue: "other" })).ok, false);
  assert.equal(validateSystemBlueprint(withField({ defaultValue: null, nullable: false })).ok, false);
  assert.equal(validateSystemBlueprint(withField({ referenceEntity: "orders" })).ok, false);
  assert.equal(validateSystemBlueprint(withField({ relationshipType: "one-to-one" })).ok, false);
});

test("rejects duplicate fields and unknown relationship targets", () => {
  const duplicate = { ...base, entities: [{ ...base.entities[0], fields: [base.entities[0].fields[0], base.entities[0].fields[0]] }] };
  assert.equal(validateSystemBlueprint(duplicate).ok, false);
  assert.equal(validateSystemBlueprint(withField({ referenceEntity: "missing", relationshipType: "many-to-one" })).ok, false);
});

test("field metadata changes canonical hashes", async () => {
  const first = await compile(withField({ validation: { minLength: 2 } }));
  const second = await compile(withField({ validation: { minLength: 3 } }));
  assert.notEqual(first.source.blueprintHash, second.source.blueprintHash);
  assert.notEqual(first.provisioningPlanHash, second.provisioningPlanHash);
});
