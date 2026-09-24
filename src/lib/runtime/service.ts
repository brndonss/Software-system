import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { jsonObjectSchema, jsonValueSchema, type JsonValue } from "@/lib/ai/interview-contracts";

export const runtimeFilterSchema = z.object({
  field: z.string().regex(/^[a-z][a-z0-9_]*$/),
  operator: z.enum(["equals", "contains", "starts_with", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "is_empty", "is_not_empty", "in"]),
  value: jsonValueSchema.optional(),
}).strict();

export const runtimeRecordPayloadSchema = z.object({
  recordKey: z.string().trim().min(1).max(200).optional(),
  values: z.record(z.string(), jsonValueSchema),
}).strict();

export const runtimeUpdatePayloadSchema = runtimeRecordPayloadSchema.extend({
  expectedVersion: z.number().int().positive(),
}).strict();

export type RuntimeContext = {
  customerId: string;
  workspaceId: string;
  deploymentId: string;
  deployment: Record<string, unknown>;
  supabase: SupabaseClient;
};

type Row = Record<string, unknown>;
type RuntimeEntity = Row & { id: string; key: string };
type RuntimeField = Row & { id: string; entity_id: string; key: string; data_type: string; required: boolean; is_unique: boolean; options: unknown; validation: unknown };

export class RuntimeServiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "RuntimeServiceError";
  }
}

function row(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RuntimeServiceError("invalid_runtime_row", "Invalid runtime metadata", 500);
  return value as Row;
}

function rows(value: unknown): Row[] { return Array.isArray(value) ? value.map(row) : []; }

export async function resolveActiveRuntime(customerId: string, supabase: SupabaseClient, requestedWorkspaceId?: string): Promise<RuntimeContext> {
  let query = supabase.from("workspace_active_deployments").select("workspace_id, customer_id, deployment_id, changed_at").eq("customer_id", customerId).order("changed_at", { ascending: false }).limit(2);
  if (requestedWorkspaceId) query = query.eq("workspace_id", requestedWorkspaceId);
  const result = await query;
  if (result.error) throw new RuntimeServiceError("runtime_context_failed", "Unable to resolve the active workspace", 500);
  const pointers = rows(result.data);
  if (!pointers.length) throw new RuntimeServiceError("inactive_deployment", "No active runtime deployment is available", 404);
  if (!requestedWorkspaceId && pointers.length > 1 && String(pointers[0].workspace_id) !== String(pointers[1].workspace_id)) throw new RuntimeServiceError("workspace_required", "A workspace must be selected", 409);
  const pointer = pointers[0];
  const deploymentResult = await supabase.from("workspace_deployments").select("*").eq("id", pointer.deployment_id).eq("workspace_id", pointer.workspace_id).eq("customer_id", customerId).eq("state", "ready").maybeSingle();
  if (deploymentResult.error || !deploymentResult.data) throw new RuntimeServiceError("inactive_deployment", "The active runtime deployment is unavailable", 404);
  return { customerId, workspaceId: String(pointer.workspace_id), deploymentId: String(pointer.deployment_id), deployment: row(deploymentResult.data), supabase };
}

export async function loadEntity(context: RuntimeContext, entityKey: string): Promise<RuntimeEntity> {
  const result = await context.supabase.from("runtime_entities").select("*").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).eq("key", entityKey).eq("status", "active").maybeSingle();
  if (result.error) throw new RuntimeServiceError("entity_lookup_failed", "Unable to load entity", 500);
  if (!result.data) throw new RuntimeServiceError("unknown_entity", "Entity not found", 404);
  return row(result.data) as RuntimeEntity;
}

export async function loadFields(context: RuntimeContext, entityId: string): Promise<RuntimeField[]> {
  const result = await context.supabase.from("runtime_fields").select("*").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).eq("entity_id", entityId).order("ordinal", { ascending: true });
  if (result.error) throw new RuntimeServiceError("field_lookup_failed", "Unable to load entity fields", 500);
  return rows(result.data) as RuntimeField[];
}

export async function loadRuntimeMetadata(context: RuntimeContext) {
  const scoped = (table: string) => context.supabase.from(table).select("*").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId);
  const [entities, fields, relationships, roles, permissions, workflows, views, automations, integrations, reports, agents] = await Promise.all([
    scoped("runtime_entities").eq("status", "active").order("ordinal", { ascending: true }),
    scoped("runtime_fields").order("ordinal", { ascending: true }),
    scoped("runtime_relationships"),
    scoped("runtime_roles"),
    scoped("runtime_permissions"),
    scoped("runtime_workflows").eq("enabled", true),
    scoped("runtime_views").order("ordinal", { ascending: true }),
    scoped("runtime_automations").eq("enabled", true),
    scoped("runtime_integrations"),
    scoped("runtime_reports"),
    scoped("runtime_agents"),
  ]);
  for (const result of [entities, fields, relationships, roles, permissions, workflows, views, automations, integrations, reports, agents]) if (result.error) throw new RuntimeServiceError("runtime_metadata_failed", "Unable to load runtime metadata", 500);
  return { entities: rows(entities.data), fields: rows(fields.data), relationships: rows(relationships.data), roles: rows(roles.data), permissions: rows(permissions.data), workflows: rows(workflows.data), views: rows(views.data), automations: rows(automations.data), integrations: rows(integrations.data).map(({ config: _config, ...safe }) => safe), reports: rows(reports.data), agents: rows(agents.data).map(({ model_config: _modelConfig, ...safe }) => safe) };
}

export async function loadRuntimePermissions(context: RuntimeContext): Promise<Row[]> {
  const result = await context.supabase.from("runtime_permissions").select("*").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId);
  if (result.error) throw new RuntimeServiceError("permission_lookup_failed", "Unable to load runtime permissions", 500);
  return rows(result.data);
}

export async function assertRuntimePermission(context: RuntimeContext, entityId: string, action: string, fieldId?: string): Promise<void> {
  const permissions = await loadRuntimePermissions(context);
  const allowed = permissions.some((permission) => {
    if (String(permission.action) !== action || String(permission.entity_id) !== entityId) return false;
    return permission.field_id === null || permission.field_id === undefined || String(permission.field_id) === fieldId;
  });
  if (!allowed) throw new RuntimeServiceError("forbidden", "You are not authorized for this runtime action", 403);
}

function fieldTypeValid(field: RuntimeField, value: JsonValue): boolean {
  if (value === null) return Boolean((field.validation as Row)?.nullable ?? true);
  switch (field.data_type) {
    case "text": case "textarea": case "email": return typeof value === "string";
    case "number": case "currency": return typeof value === "number" && Number.isFinite(value);
    case "boolean": return typeof value === "boolean";
    case "date": return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
    case "select": return typeof value === "string" && Array.isArray(field.options) && field.options.includes(value);
    default: return false;
  }
}

function fieldValidationValid(field: RuntimeField, value: JsonValue): boolean {
  if (typeof value !== "string") return true;
  const validation = (field.validation && typeof field.validation === "object" ? field.validation : {}) as Row;
  if (typeof validation.minLength === "number" && value.length < validation.minLength) return false;
  if (typeof validation.maxLength === "number" && value.length > validation.maxLength) return false;
  if (typeof validation.pattern === "string" && !new RegExp(validation.pattern).test(value)) return false;
  if (typeof value === "number") {
    if (typeof validation.min === "number" && value < validation.min) return false;
    if (typeof validation.max === "number" && value > validation.max) return false;
  }
  return true;
}

export function validateValues(fields: RuntimeField[], values: Record<string, JsonValue>, requireRequiredFields: boolean): Map<string, RuntimeField> {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  for (const key of Object.keys(values)) if (!byKey.has(key)) throw new RuntimeServiceError("unknown_field", `Unknown field ${key}`, 422);
  if (requireRequiredFields) for (const field of fields) if (field.required && values[field.key] === undefined && field.validation && (field.validation as Row).defaultValue === undefined) throw new RuntimeServiceError("missing_required_field", `Missing required field ${field.key}`, 422);
  for (const [key, value] of Object.entries(values)) {
    const field = byKey.get(key)!;
    if (!fieldTypeValid(field, value as JsonValue)) throw new RuntimeServiceError("invalid_value", `Invalid value for field ${key}`, 422);
    if (!fieldValidationValid(field, value as JsonValue)) throw new RuntimeServiceError("invalid_value", `Value failed validation for field ${key}`, 422);
  }
  return byKey;
}

export async function validateReferenceValues(context: RuntimeContext, fields: RuntimeField[], values: Record<string, JsonValue>): Promise<void> {
  for (const field of fields) {
    const referenceEntity = (field.validation as Row)?.referenceEntity;
    if (!referenceEntity || values[field.key] === undefined || values[field.key] === null) continue;
    const target = await loadEntity(context, String(referenceEntity));
    const raw = Array.isArray(values[field.key]) ? values[field.key] as JsonValue[] : [values[field.key]];
    const ids = raw.filter((value): value is string => typeof value === "string");
    if (ids.length !== raw.length) throw new RuntimeServiceError("invalid_relationship", `Field ${field.key} requires record identifiers`, 422);
    const result = await context.supabase.from("runtime_records").select("id").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).eq("entity_id", target.id).in("id", ids).is("deleted_at", null);
    if (result.error) throw result.error;
    if ((result.data ?? []).length !== new Set(ids).size) throw new RuntimeServiceError("invalid_relationship", `Field ${field.key} references a record outside the active deployment`, 422);
  }
}

function filterColumn(field: RuntimeField): string {
  if (["number", "currency"].includes(field.data_type)) return "number_value";
  if (field.data_type === "boolean") return "boolean_value";
  if (field.data_type === "date") return "date_value";
  if (["text", "textarea", "email", "select"].includes(field.data_type)) return "text_value";
  return "json_value";
}

export async function matchingRecordIds(context: RuntimeContext, entityId: string, fields: RuntimeField[], filters: z.infer<typeof runtimeFilterSchema>[]): Promise<string[] | null> {
  if (!filters.length) return null;
  let intersection: Set<string> | null = null;
  for (const filter of filters) {
    const field = fields.find((candidate) => candidate.key === filter.field);
    if (!field) throw new RuntimeServiceError("unknown_field", `Unknown filter field ${filter.field}`, 422);
    const column = filterColumn(field);
    let ids: string[];
    if (["is_empty", "is_not_empty"].includes(filter.operator)) {
      const all = await context.supabase.from("runtime_records").select("id").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).eq("entity_id", entityId).is("deleted_at", null);
      if (all.error) throw all.error;
      const present = await context.supabase.from("runtime_values").select("record_id").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).eq("field_id", field.id).not(column, "is", null);
      if (present.error) throw present.error;
      const presentIds = new Set((present.data ?? []).map((item) => String(item.record_id)));
      ids = (all.data ?? []).map((item) => String(item.id)).filter((id) => filter.operator === "is_not_empty" ? presentIds.has(id) : !presentIds.has(id));
    } else {
      let query = context.supabase.from("runtime_values").select("record_id").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).eq("field_id", field.id);
      const value = filter.value;
      if (["equals", "contains", "starts_with", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal"].includes(filter.operator) && value === undefined) throw new RuntimeServiceError("invalid_filter", `Filter ${filter.field} requires a value`, 422);
      if (filter.operator === "equals") query = query.eq(column, value as string | number | boolean);
      if (filter.operator === "contains") query = query.ilike(column, `%${String(value)}%`);
      if (filter.operator === "starts_with") query = query.ilike(column, `${String(value)}%`);
      if (filter.operator === "greater_than") query = query.gt(column, value as string | number);
      if (filter.operator === "greater_than_or_equal") query = query.gte(column, value as string | number);
      if (filter.operator === "less_than") query = query.lt(column, value as string | number);
      if (filter.operator === "less_than_or_equal") query = query.lte(column, value as string | number);
      if (filter.operator === "in") {
        if (!Array.isArray(value) || value.length === 0) throw new RuntimeServiceError("invalid_filter", "in filter requires a non-empty array", 422);
        query = query.in(column, value as (string | number | boolean)[]);
      }
      const result = await query;
      if (result.error) throw result.error;
      ids = (result.data ?? []).map((item) => String(item.record_id));
    }
    const current = new Set<string>(ids);
    if (intersection) {
      const next = new Set<string>();
      for (const id of intersection) if (current.has(id)) next.add(id);
      intersection = next;
    } else {
      intersection = current;
    }
  }
  return [...(intersection ?? new Set<string>())];
}

export function typedValue(value: JsonValue): Record<string, unknown> {
  if (typeof value === "string") return { text_value: value };
  if (typeof value === "number") return { number_value: value };
  if (typeof value === "boolean") return { boolean_value: value };
  if (value === null) return { json_value: null };
  return { json_value: value };
}

export function parseFilters(raw: string | null): z.infer<typeof runtimeFilterSchema>[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new RuntimeServiceError("invalid_filter", "Filters must be valid JSON", 422); }
  const result = z.array(runtimeFilterSchema).safeParse(parsed);
  if (!result.success) throw new RuntimeServiceError("unsupported_filter", "Filter format is not supported", 422);
  return result.data;
}

export function safeProjection(raw: string | null, fields: RuntimeField[]): RuntimeField[] {
  if (!raw) return fields;
  const keys = raw.split(",").map((key) => key.trim()).filter(Boolean);
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const selected = keys.map((key) => byKey.get(key));
  if (selected.some((field) => !field)) throw new RuntimeServiceError("unknown_field", "Projection references an unknown field", 422);
  return selected as RuntimeField[];
}

export function jsonObject(value: unknown): Row { return jsonObjectSchema.parse(value); }
