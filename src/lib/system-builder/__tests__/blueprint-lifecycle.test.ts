import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedBlueprintTransitions,
  blueprintTransitionRequestSchema,
  canTransitionBlueprint,
  rejectBlueprintRequestSchema,
} from "@/lib/system-builder/blueprint-lifecycle";
import { lifecycleError } from "@/lib/system-builder/blueprint-lifecycle-route";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";

const validBlueprint = {
  schemaVersion: 1,
  business: { summary: "A business", vertical: "services", operationalFocus: "Core operations" },
  entities: [{ key: "records", label: "Records", description: "Operating records", fields: [{ key: "name", label: "Name", type: "text", required: true, unique: false }] }],
  relationships: [],
  workflows: [{ key: "intake", name: "Intake", description: "Intake workflow", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create a record", entity: "records", config: { entity: "records" } }] }],
  roles: [{ key: "owner", name: "Owner", description: "Business owner", permissions: [{ action: "read", entity: "records" }, { action: "approve", entity: "records" }] }],
  views: [{ key: "records", name: "Records", entity: "records", type: "table" }],
  automations: [],
  integrations: [],
  agent: { key: "coordinator", name: "Coordinator", persona: "Careful", mission: "Coordinate work", responsibilities: ["Review records"], guardrails: ["Respect permissions"], allowedTools: ["search_records"], allowedEntities: ["records"], allowedActions: [{ action: "read", entity: "records" }], integrations: [], modelConfig: {}, escalationRules: ["Escalate uncertainty"] },
  assumptions: [],
  clarificationNeeded: [],
};

test("allows only the canonical blueprint lifecycle transitions", () => {
  assert.equal(canTransitionBlueprint("draft", "in_review"), true);
  assert.equal(canTransitionBlueprint("in_review", "approved"), true);
  assert.equal(canTransitionBlueprint("in_review", "rejected"), true);
  assert.equal(canTransitionBlueprint("rejected", "in_review"), true);
  assert.equal(canTransitionBlueprint("approved", "in_review"), false);
  assert.equal(canTransitionBlueprint("draft", "approved"), false);
  assert.deepEqual(allowedBlueprintTransitions.approved, []);
});

test("requires the expected blueprint version for every transition", () => {
  assert.deepEqual(blueprintTransitionRequestSchema.parse({ expectedVersion: 3 }), { expectedVersion: 3 });
  assert.throws(() => blueprintTransitionRequestSchema.parse({ expectedVersion: 0 }));
  assert.throws(() => blueprintTransitionRequestSchema.parse({ expectedVersion: 3, customerId: "other" }));
});

test("requires rejection notes and supports resubmission after rejection", () => {
  assert.deepEqual(rejectBlueprintRequestSchema.parse({ expectedVersion: 2, reviewNotes: "Add the approval workflow." }).reviewNotes, "Add the approval workflow.");
  assert.throws(() => rejectBlueprintRequestSchema.parse({ expectedVersion: 2, reviewNotes: " " }));
  assert.equal(canTransitionBlueprint("rejected", "in_review"), true);
});

test("approval input must pass the existing blueprint validator", () => {
  assert.equal(validateSystemBlueprint(validBlueprint).ok, true);
  assert.equal(validateSystemBlueprint({ ...validBlueprint, schemaVersion: 2 }).ok, false);
});

test("transition error codes represent tenant, version, and validation guards", () => {
  assert.equal(lifecycleError({ code: "42501" }, "fallback").status, 403);
  assert.equal(lifecycleError({ code: "P0004" }, "fallback").status, 409);
  assert.equal(lifecycleError({ code: "P0005" }, "fallback").status, 422);
});
