import assert from "node:assert/strict";
import test from "node:test";
import { buildBlueprintRequest } from "@/app/components/command-canvas-contract";
import { blueprintRequestSchema } from "@/app/api/v1/system-builder/blueprint/route";
import { buildBlueprintGenerationContext } from "@/app/api/v1/system-builder/blueprint/context";
import { canStartDraft, getCreatedDraft } from "@/app/components/command-canvas-draft";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";

const validBlueprint = {
  schemaVersion: 1,
  business: {
    summary: "Manage inbound inventory and shipments across multiple locations.",
    vertical: "logistics",
    operationalFocus: "Receiving, discrepancy detection, and exceptions.",
  },
  entities: [
    {
      key: "locations",
      label: "Locations",
      description: "Warehouse and distribution locations.",
      fields: [
        { key: "name", label: "Name", type: "text", required: true, unique: true },
        { key: "status", label: "Status", type: "select", required: true, unique: false, options: ["active", "inactive"] },
      ],
    },
    {
      key: "shipments",
      label: "Shipments",
      description: "Incoming freight records.",
      fields: [
        { key: "code", label: "Code", type: "text", required: true, unique: true },
        { key: "location_id", label: "Location", type: "text", required: true, unique: false, referenceEntity: "locations", relationshipType: "many-to-one" as never },
      ],
    },
  ],
  relationships: [{ fromEntity: "locations", toEntity: "shipments", relationshipType: "one-to-many", label: "Location shipments" }],
  workflows: [{
    key: "receiving",
    name: "Receiving workflow",
    description: "Record incoming shipments and compare against expectations.",
    trigger: "record_created",
    triggerConfig: {},
    steps: [
      { key: "receive", type: "create_record", description: "Add shipment record.", entity: "shipments", config: { entity: "shipments" } },
      { key: "notify", type: "notify", description: "Notify the team of discrepancies.", entity: "shipments", config: { message: "Shipment discrepancy detected." } },
    ],
  }],
  roles: [{
    key: "warehouse_manager",
    name: "Warehouse Manager",
    description: "Oversees receiving and exceptions.",
    permissions: [
      { action: "read", entity: "shipments" },
      { action: "update", entity: "shipments", field: "code" },
      { action: "assign", entity: "shipments" },
    ],
  }],
  views: [{
    key: "receiving_dashboard",
    name: "Receiving dashboard",
    entity: "shipments",
    type: "dashboard",
  }],
  automations: [{
    key: "discrepancy_alerts",
    trigger: "record_updated",
    actions: ["notify", "create_task"],
    conditions: ["quantity mismatch"],
  }],
  integrations: [{
    key: "mail_alerts",
    provider: "email",
    capability: "notification",
    purpose: "Send discrepancy alerts",
  }],
  agent: {
    key: "cargo_auditor",
    name: "Incoming Cargo Auditor",
    persona: "Diligent operations specialist.",
    mission: "Compare expected arrivals against received inventory and escalate exceptions.",
    responsibilities: ["Check inbound shipments", "Compare quantities", "Escalate discrepancies"],
    guardrails: ["Never bypass permissions", "Never invent records"],
    allowedTools: ["read_customer_data", "search_records", "update_record", "notify_team"],
    allowedEntities: ["shipments"],
    allowedActions: [{ action: "read", entity: "shipments" }, { action: "update", entity: "shipments", field: "code" }],
    integrations: ["mail_alerts"],
    modelConfig: {},
    escalationRules: ["Escalate to warehouse manager when shipment does not match expected quantity"],
  },
  assumptions: ["Receiving data is available in the warehouse system."],
  clarificationNeeded: [],
};

test("accepts a valid blueprint schema", () => {
  const result = validateSystemBlueprint(validBlueprint);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("rejects malformed blueprint structures", () => {
  const result = validateSystemBlueprint({ schemaVersion: "1" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("creates a draft request from a completed conversation using its persisted session", () => {
  const request = buildBlueprintRequest("00000000-0000-4000-8000-000000000020");

  assert.deepEqual(request, {
    sessionId: "00000000-0000-4000-8000-000000000020",
  });
  assert.equal("businessDescription" in request, false);
});

test("keeps the backend blueprint ID unchanged for lifecycle requests", () => {
  const blueprintId = "00000000-0000-4000-8000-000000000021";
  const created = getCreatedDraft({
    draft: { id: blueprintId, version: 1, status: "draft" },
    blueprint: validBlueprint,
  });

  assert.equal(created?.id, blueprintId);
});

test("reproduces the old oversized transcript request failure", () => {
  const result = blueprintRequestSchema.safeParse({
    sessionId: "00000000-0000-4000-8000-000000000020",
    businessDescription: "x".repeat(4001),
  });

  assert.equal(result.success, false);
});

test("requires the created draft ID before showing a successful draft", () => {
  assert.equal(getCreatedDraft({ blueprint: validBlueprint }), null);
  assert.equal(getCreatedDraft({ draft: { id: "draft-1" }, blueprint: validBlueprint })?.id, "draft-1");
});

test("prevents duplicate draft creation while the request is pending", () => {
  assert.equal(canStartDraft("00000000-0000-4000-8000-000000000020", false), true);
  assert.equal(canStartDraft("00000000-0000-4000-8000-000000000020", true), false);
  assert.equal(canStartDraft(null, false), false);
});

test("uses only the current session answers for session-backed draft generation", () => {
  const context = buildBlueprintGenerationContext({
    sessionId: "session-restaurant",
    onboardingData: { business_niche: "warehouse", additional_information: "warehouse language" },
    onboardingSessions: [{ id: "session-warehouse" }],
    sessionAnswers: [{
      question_key: "business.description",
      answer_json: { value: "A neighborhood restaurant" },
      normalized_facts: { business: { description: "A neighborhood restaurant" } },
    }],
  });

  assert.deepEqual(context.onboarding_sessions, [{ id: "session-restaurant" }]);
  assert.deepEqual(context.onboarding_answers[0], {
    question_key: "business.description",
    answer_json: { value: "A neighborhood restaurant" },
    normalized_facts: { business: { description: "A neighborhood restaurant" } },
  });
  assert.equal("business_niche" in context, false);
});

test("rejects duplicate entity keys", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    entities: [
      { key: "shipments", label: "Shipments", description: "One", fields: [{ key: "name", label: "Name", type: "text", required: true, unique: false }] },
      { key: "shipments", label: "Shipments", description: "Two", fields: [{ key: "code", label: "Code", type: "text", required: true, unique: false }] },
    ],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate entity key: shipments")));
});

test("rejects duplicate field names", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    entities: [{
      key: "shipments",
      label: "Shipments",
      description: "Incoming freight records.",
      fields: [
        { key: "code", label: "Code", type: "text", required: true, unique: false },
        { key: "code", label: "Code Duplicate", type: "text", required: false, unique: false },
      ],
    }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate field code on entity shipments")));
});

test("rejects invalid relationship targets", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    relationships: [{ fromEntity: "missing", toEntity: "shipments", relationshipType: "one-to-many", label: "Missing link" }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("Relationship fromEntity missing does not exist")));
});

test("rejects invalid workflow entity references", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    workflows: [{
      key: "receiving",
      name: "Receiving workflow",
      description: "Test",
      trigger: "record_created",
      steps: [{ key: "missing", type: "create_record", description: "Missing entity", entity: "not_found" }],
    }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("Workflow receiving references missing entity not_found")));
});

test("rejects invalid role permissions", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    roles: [{ key: "manager", name: "Manager", description: "Manager role", permissions: [{ action: "totally_fake_permission", entity: "shipments" } as never] }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("rejects invalid view entity references", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    views: [{ key: "dashboard", name: "Dashboard", entity: "missing_entity", type: "dashboard" }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("View dashboard references missing entity missing_entity")));
});

test("rejects invalid agent tool references", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    agent: { ...validBlueprint.agent, allowedTools: ["totally_fake_tool"] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("Unsupported agentTools capability")));
});

test("rejects unsupported capability values", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    views: [{ key: "custom_view", name: "Custom", entity: "shipments", type: "graph" as never }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("rejects missing critical information", () => {
  const result = validateSystemBlueprint({
    ...validBlueprint,
    business: { summary: "", vertical: "", operationalFocus: "" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("rejects malformed AI output", () => {
  const result = validateSystemBlueprint({
    schemaVersion: 1,
    business: { summary: "Test" },
  } as never);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});
