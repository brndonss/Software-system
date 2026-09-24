import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0010_runtime_foundation.sql";
const runtimeTables = [
  "workspace_deployments",
  "workspace_active_deployments",
  "runtime_entities",
  "runtime_fields",
  "runtime_relationships",
  "runtime_roles",
  "runtime_permissions",
  "runtime_role_permissions",
  "runtime_workflows",
  "runtime_workflow_steps",
  "runtime_views",
  "runtime_automations",
  "runtime_integrations",
  "runtime_reports",
  "runtime_agents",
  "runtime_records",
  "runtime_values",
  "runtime_record_relationships",
  "runtime_record_events",
];

test("Phase 3A migration defines generic runtime tables and scoped relationships", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of runtimeTables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }

  assert.match(sql, /customer_id uuid not null references public\.customers/);
  assert.match(sql, /workspace_id uuid not null references public\.workspaces/);
  assert.match(sql, /deployment_id uuid not null/);
  assert.match(sql, /foreign key \(deployment_id, workspace_id, customer_id\) references public\.workspace_deployments/);
});

test("Phase 3A migration provides owner-only authorization helpers and active gating", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.is_workspace_owner/);
  assert.match(sql, /create or replace function public\.is_workspace_deployment_owner/);
  assert.match(sql, /create or replace function public\.is_active_workspace_deployment/);
  assert.match(sql, /Owners can read runtime entities[\s\S]*is_active_workspace_deployment/);
  assert.match(sql, /Owners can read runtime records[\s\S]*deleted_at is null/);
  assert.doesNotMatch(sql, /create policy "Owners can create runtime/);
  assert.doesNotMatch(sql, /create policy "Owners can update runtime/);
});

test("Phase 3A migration keeps integration secrets out of JSON configuration", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /secret_ref text/);
  assert.match(sql, /config jsonb not null default '\{\}'::jsonb/);
});

test("Phase 3A migration gives every composite foreign key a matching parent identity", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const tables = new Map<string, string>();
  const tablePattern = /create table public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/g;

  for (const match of sql.matchAll(tablePattern)) {
    tables.set(match[1], match[2]);
  }

  const foreignKeyPattern = /foreign key\s*\(([^)]+)\)\s*references\s+public\.([a-z_]+)\s*\(([^)]+)\)/g;
  for (const match of sql.matchAll(foreignKeyPattern)) {
    const childColumns = match[1].split(",").map((column) => column.trim());
    if (childColumns.length < 2) continue;

    const parentTable = tables.get(match[2]);
    assert.ok(parentTable, `parent table ${match[2]} must be defined`);
    const parentColumns = match[3].split(",").map((column) => column.trim());
    const identityPattern = parentColumns.join("\\s*,\\s*");
    const hasMatchingIdentity = ["primary key", "unique"].some((constraint) =>
      new RegExp(`${constraint}\\s*\\(${identityPattern}\\)`, "i").test(parentTable),
    );

    assert.ok(
      hasMatchingIdentity,
      `foreign key (${childColumns.join(", ")}) references ${match[2]}(${parentColumns.join(", ")}) without a matching primary or unique constraint`,
    );

    if (match[2].startsWith("runtime_")) {
      assert.ok(childColumns.includes("deployment_id"), `runtime FK to ${match[2]} must include deployment_id`);
      assert.ok(parentColumns.includes("deployment_id"), `runtime FK to ${match[2]} must reference deployment_id`);
    }
  }
});

test("runtime permission references preserve parent identity column order", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /foreign key \(entity_id, deployment_id, workspace_id, customer_id\) references public\.runtime_entities\(id, deployment_id, workspace_id, customer_id\)/);
  assert.match(sql, /foreign key \(field_id, deployment_id, workspace_id, customer_id\) references public\.runtime_fields\(id, deployment_id, workspace_id, customer_id\)/);
  assert.doesNotMatch(sql, /foreign key \(deployment_id, entity_id, workspace_id, customer_id\) references public\.runtime_entities/);
  assert.doesNotMatch(sql, /foreign key \(deployment_id, field_id, workspace_id, customer_id\) references public\.runtime_fields/);
});

test("forward migration replaces the malformed deployed permission constraints", async () => {
  const sql = await readFile("supabase/migrations/0014_fix_runtime_permission_scope_fk.sql", "utf8");

  assert.match(sql, /drop constraint if exists runtime_permissions_deployment_id_entity_id_workspace_id_c_fkey/);
  assert.match(sql, /foreign key \(entity_id, deployment_id, workspace_id, customer_id\)/);
  assert.match(sql, /foreign key \(field_id, deployment_id, workspace_id, customer_id\)/);
});
