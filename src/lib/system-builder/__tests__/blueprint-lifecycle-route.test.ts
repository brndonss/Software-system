import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("lifecycle routes validate their blueprintId path parameter", async () => {
  const source = await readFile("src/lib/system-builder/blueprint-lifecycle-route.ts", "utf8");

  assert.match(source, /safeParse\(\{ sessionId: \(await params\)\.blueprintId \}\)/);
  assert.doesNotMatch(source, /safeParse\(await params\)/);
});

test("draft lookup is scoped to the current onboarding session", async () => {
  const source = await readFile("src/app/api/v1/system-builder/blueprint/route.ts", "utf8");

  assert.match(source, /eq\("onboarding_session_id", sessionId\)/);
  assert.match(source, /eq\("customer_id", resolved\.customerId\)/);
});