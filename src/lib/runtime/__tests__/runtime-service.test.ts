import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parseFilters, safeProjection, RuntimeServiceError, typedValue, validateValues } from "@/lib/runtime/service";

const fields = [
  { id: "name-id", entity_id: "entity", key: "name", data_type: "text", required: true, is_unique: false, options: [], validation: { nullable: false, minLength: 2 } },
  { id: "status-id", entity_id: "entity", key: "status", data_type: "select", required: false, is_unique: false, options: ["open", "done"], validation: { nullable: true } },
  { id: "amount-id", entity_id: "entity", key: "amount", data_type: "number", required: false, is_unique: false, options: [], validation: { nullable: true, min: 0 } },
] as never[];

test("validates typed values, required fields, allowed values, and declarative validation", () => {
  validateValues(fields as never[], { name: "Northstar", status: "open", amount: 3 }, true);
  assert.throws(() => validateValues(fields as never[], { status: "open" }, true), (error) => error instanceof RuntimeServiceError && error.code === "missing_required_field");
  assert.throws(() => validateValues(fields as never[], { name: "N" }, true), (error) => error instanceof RuntimeServiceError && error.code === "invalid_value");
  assert.throws(() => validateValues(fields as never[], { name: "Northstar", status: "unknown" }, true), (error) => error instanceof RuntimeServiceError && error.code === "invalid_value");
});

test("rejects unknown fields and accepts explicit projections/filters", () => {
  assert.throws(() => validateValues(fields as never[], { missing: "x" }, false), (error) => error instanceof RuntimeServiceError && error.code === "unknown_field");
  assert.deepEqual(safeProjection("name,status", fields as never[]).map((field) => field.key), ["name", "status"]);
  assert.deepEqual(parseFilters(JSON.stringify([{ field: "amount", operator: "greater_than", value: 0 }])), [{ field: "amount", operator: "greater_than", value: 0 }]);
  assert.throws(() => parseFilters("not-json"), (error) => error instanceof RuntimeServiceError && error.code === "invalid_filter");
});

test("typed values map to one runtime value column", () => {
  assert.deepEqual(typedValue("hello"), { text_value: "hello" });
  assert.deepEqual(typedValue(3), { number_value: 3 });
  assert.deepEqual(typedValue(true), { boolean_value: true });
  assert.deepEqual(typedValue({ nested: "value" }), { json_value: { nested: "value" } });
});

test("runtime routes resolve active deployment and expose no arbitrary SQL path", async () => {
  const bootstrap = await readFile("src/app/api/v1/runtime/bootstrap/route.ts", "utf8");
  const records = await readFile("src/app/api/v1/runtime/entities/[entityKey]/records/route.ts", "utf8");
  assert.match(bootstrap, /resolveRuntimeRequest/);
  assert.match(records, /parseFilters/);
  assert.doesNotMatch(records, /raw SQL|from\(.*request/);
});
