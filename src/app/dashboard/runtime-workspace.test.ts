import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("authenticated dashboard uses active runtime bootstrap instead of legacy configuration", async () => {
  const page = await readFile("src/app/dashboard/page.tsx", "utf8");
  const component = await readFile("src/app/components/RuntimeWorkspace.tsx", "utf8");
  assert.match(page, /RuntimeWorkspace/);
  assert.match(component, /\/api\/v1\/runtime\/bootstrap/);
  assert.doesNotMatch(page, /system-configurations\/active/);
  assert.doesNotMatch(component, /system-configurations\/active|business\/automations|business\/activity/);
});

test("runtime workspace renders dynamic entity/field data and generic record mutations", async () => {
  const component = await readFile("src/app/components/RuntimeWorkspace.tsx", "utf8");
  assert.match(component, /bootstrap\.entities\.map/);
  assert.match(component, /fieldsFor/);
  assert.match(component, /runtime\/entities/);
  assert.match(component, /expectedVersion/);
  assert.match(component, /stale_record_version/);
  assert.match(component, /Unsupported field type/);
  assert.doesNotMatch(component, /if \(.*warehouse|restaurant|construction|software/);
});

test("runtime empty and permission/error states are explicit", async () => {
  const component = await readFile("src/app/components/RuntimeWorkspace.tsx", "utf8");
  assert.match(component, /No active runtime deployment/);
  assert.match(component, /role="alert"/);
  assert.match(component, /permission/i);
});
