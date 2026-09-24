import assert from "node:assert/strict";
import test from "node:test";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";
import { compileApprovedBlueprint } from "@/lib/system-builder/compiler";

const ids = { workspaceId: "00000000-0000-4000-8000-000000000041", blueprintId: "00000000-0000-4000-8000-000000000042" };
const base = {
  schemaVersion: 1,
  business: { summary: "Report system", vertical: "services", operationalFocus: "Review work" },
  entities: [{ key: "orders", label: "Orders", description: "Orders", fields: [
    { key: "status", label: "Status", type: "select", required: true, unique: false, options: ["open", "complete"] },
    { key: "amount", label: "Amount", type: "number", required: false, unique: false },
    { key: "created", label: "Created", type: "date", required: true, unique: false },
  ] }],
  relationships: [],
  workflows: [{ key: "intake", name: "Intake", description: "Intake", trigger: "manual", triggerConfig: {}, steps: [{ key: "create", type: "create_record", description: "Create", entity: "orders", config: { entity: "orders" } }] }],
  roles: [{ key: "operator", name: "Operator", description: "Operator", permissions: [{ action: "read", entity: "orders" }] }],
  views: [{ key: "orders", name: "Orders", entity: "orders", type: "table" }],
  automations: [], integrations: [],
  reports: [{
    key: "order_summary",
    name: "Order summary",
    description: "Order status and totals",
    sourceEntity: "orders",
    selectedFields: [{ entity: "orders", field: "status" }],
    filters: [{ entity: "orders", field: "status", operator: "equals", value: "open" }],
    grouping: [{ entity: "orders", field: "status" }],
    sorting: [{ entity: "orders", field: "amount", direction: "desc" }],
    measures: [{ key: "total_amount", entity: "orders", field: "amount", aggregation: "sum", label: "Total amount" }],
    visualization: "bar",
  }],
  agent: { key: "agent", name: "Agent", persona: "Careful", mission: "Review", responsibilities: ["Review"], guardrails: ["Respect access"], allowedTools: ["search_records"], allowedEntities: ["orders"], allowedActions: [{ action: "read", entity: "orders" }], integrations: [], modelConfig: {}, escalationRules: ["Escalate"] },
  assumptions: [], clarificationNeeded: [],
};
function compile(blueprint: unknown) { return compileApprovedBlueprint({ ...ids, blueprintVersion: 1, blueprintStatus: "approved", validationStatus: "valid", blueprint }); }

test("compiles a valid declarative report into runtime-compatible metadata and a plan operation", async () => {
  assert.equal(validateSystemBlueprint(base).ok, true);
  const result = await compile(base);
  assert.equal(result.compiledWorkspace.reports[0].key, "order_summary");
  const operation = result.provisioningPlan.operations.find((item) => item.kind === "register_report");
  assert.ok(operation);
  assert.deepEqual(operation?.payload.filters, base.reports[0].filters);
  assert.ok(operation?.dependsOn.includes("register_field:orders.amount"));
});

test("rejects unknown entities, fields, cross-entity fields, and duplicate report keys", () => {
  const unknownEntity = structuredClone(base);
  unknownEntity.reports[0].sourceEntity = "missing";
  assert.equal(validateSystemBlueprint(unknownEntity).ok, false);

  const unknownField = structuredClone(base);
  unknownField.reports[0].selectedFields = [{ entity: "orders", field: "missing" }];
  assert.equal(validateSystemBlueprint(unknownField).ok, false);

  const crossEntity = structuredClone(base);
  crossEntity.entities.push({ key: "customers", label: "Customers", description: "Customers", fields: [{ key: "name", label: "Name", type: "text", required: true, unique: false }] });
  crossEntity.reports[0].selectedFields = [{ entity: "customers", field: "amount" }];
  assert.equal(validateSystemBlueprint(crossEntity).ok, false);

  const duplicate = structuredClone(base);
  duplicate.reports.push({ ...duplicate.reports[0] });
  assert.equal(validateSystemBlueprint(duplicate).ok, false);
});

test("rejects malformed filters and unsupported operators", () => {
  const missingValue = structuredClone(base);
  missingValue.reports[0].filters[0] = { entity: "orders", field: "status", operator: "equals" } as never;
  assert.equal(validateSystemBlueprint(missingValue).ok, false);

  const invalidOperator = structuredClone(base);
  invalidOperator.reports[0].filters[0].operator = "raw_sql" as never;
  assert.equal(validateSystemBlueprint(invalidOperator).ok, false);

  const invalidIn = structuredClone(base);
  invalidIn.reports[0].filters[0] = { entity: "orders", field: "status", operator: "in", value: "open" } as never;
  assert.equal(validateSystemBlueprint(invalidIn).ok, false);
});

test("rejects incompatible aggregations, grouping, and sorting", () => {
  const invalidAggregation = structuredClone(base);
  invalidAggregation.reports[0].measures[0] = { key: "bad", entity: "orders", field: "status", aggregation: "sum", label: "Bad" } as never;
  assert.equal(validateSystemBlueprint(invalidAggregation).ok, false);

  const invalidGrouping = structuredClone(base);
  invalidGrouping.reports[0].grouping = [{ entity: "orders", field: "missing" }];
  assert.equal(validateSystemBlueprint(invalidGrouping).ok, false);

  const invalidSorting = structuredClone(base);
  invalidSorting.reports[0].sorting = [{ entity: "orders", field: "missing", direction: "desc" }];
  assert.equal(validateSystemBlueprint(invalidSorting).ok, false);
});

test("keeps report hashes deterministic and normalizes filter collection order", async () => {
  const first = await compile(base);
  const secondInput = structuredClone(base);
  secondInput.reports[0].filters.reverse();
  const second = await compile(secondInput);
  assert.equal(first.source.blueprintHash, second.source.blueprintHash);
  assert.equal(first.provisioningPlanHash, second.provisioningPlanHash);
});

test("compiles generic reports across different business structures", async () => {
  for (const [vertical, entity] of [["warehouse", "shipments"], ["restaurant", "reservations"], ["construction", "projects"], ["software", "tickets"]] as const) {
    const blueprint = structuredClone(base);
    blueprint.business.vertical = vertical;
    blueprint.entities[0].key = entity;
    blueprint.views[0].entity = entity;
    blueprint.roles[0].permissions[0].entity = entity;
    blueprint.agent.allowedEntities = [entity];
    blueprint.agent.allowedActions[0].entity = entity;
    blueprint.workflows[0].steps[0].entity = entity;
    blueprint.workflows[0].steps[0].config = { entity };
    blueprint.reports[0].sourceEntity = entity;
    blueprint.reports[0].selectedFields = [{ entity, field: "status" }];
    blueprint.reports[0].filters[0].entity = entity;
    blueprint.reports[0].grouping[0].entity = entity;
    blueprint.reports[0].sorting[0].entity = entity;
    blueprint.reports[0].measures[0].entity = entity;
    const result = await compile(blueprint);
    assert.equal(result.compiledWorkspace.reports[0].sourceEntity, entity);
  }
});
