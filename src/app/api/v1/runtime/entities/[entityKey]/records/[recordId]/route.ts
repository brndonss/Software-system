import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { adminContext, resolveRuntimeRequest, runtimeError } from "@/lib/runtime/route";
import { assertRuntimePermission, loadEntity, loadFields, runtimeUpdatePayloadSchema, RuntimeServiceError, typedValue, validateReferenceValues, validateValues } from "@/lib/runtime/service";

function fromValue(row: Record<string, unknown>): unknown {
  if (row.text_value !== null && row.text_value !== undefined) return row.text_value;
  if (row.number_value !== null && row.number_value !== undefined) return row.number_value;
  if (row.boolean_value !== null && row.boolean_value !== undefined) return row.boolean_value;
  if (row.date_value !== null && row.date_value !== undefined) return row.date_value;
  return row.json_value;
}

async function readRecord(context: ReturnType<typeof adminContext>, entityId: string, recordId: string, fields: Awaited<ReturnType<typeof loadFields>>) {
  const record = await context.supabase.from("runtime_records").select("id, record_key, record_version, created_by, updated_by, created_at, updated_at").eq("id", recordId).eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).eq("entity_id", entityId).is("deleted_at", null).maybeSingle();
  if (record.error) throw record.error;
  if (!record.data) throw new RuntimeServiceError("record_not_found", "Record not found", 404);
  const values = await context.supabase.from("runtime_values").select("field_id, text_value, number_value, boolean_value, date_value, json_value").eq("record_id", recordId).eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId);
  if (values.error) throw values.error;
  const fieldById = new Map(fields.map((field) => [field.id, field.key]));
  const output: Record<string, unknown> = {};
  for (const value of (values.data ?? []) as Record<string, unknown>[]) { const key = fieldById.get(String(value.field_id)); if (key) output[key] = fromValue(value); }
  return { ...record.data, values: output };
}

export async function GET(request: Request, { params }: { params: Promise<{ entityKey: string; recordId: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey, recordId } = await params;
    const entity = await loadEntity(resolved.context, entityKey);
    const fields = await loadFields(resolved.context, entity.id);
    await assertRuntimePermission(resolved.context, entity.id, "read");
    for (const field of fields) await assertRuntimePermission(resolved.context, entity.id, "read", field.id);
    return NextResponse.json({ entity, fields, record: await readRecord(adminContext(resolved.context), entity.id, recordId, fields) });
  } catch (error) { return runtimeError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entityKey: string; recordId: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey, recordId } = await params;
    const entity = await loadEntity(resolved.context, entityKey);
    const fields = await loadFields(resolved.context, entity.id);
    const parsed = runtimeUpdatePayloadSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Update payload is invalid", 422, "invalid_update_payload");
    validateValues(fields, parsed.data.values, false);
    await assertRuntimePermission(resolved.context, entity.id, "update");
    for (const field of fields.filter((candidate) => parsed.data.values[candidate.key] !== undefined)) await assertRuntimePermission(resolved.context, entity.id, "update", field.id);
    const admin = adminContext(resolved.context);
    await validateReferenceValues(admin, fields, parsed.data.values);
    const updated = await admin.supabase.from("runtime_records").update({ record_version: parsed.data.expectedVersion + 1, updated_by: resolved.user.id, updated_at: new Date().toISOString() }).eq("id", recordId).eq("workspace_id", resolved.context.workspaceId).eq("deployment_id", resolved.context.deploymentId).eq("customer_id", resolved.context.customerId).eq("entity_id", entity.id).eq("record_version", parsed.data.expectedVersion).is("deleted_at", null).select("id, record_key, record_version, created_by, updated_by, created_at, updated_at").maybeSingle();
    if (updated.error) throw updated.error;
    if (!updated.data) throw new RuntimeServiceError("stale_record_version", "Record version is stale or record was not found", 409);
    for (const [key, value] of Object.entries(parsed.data.values)) {
      const field = fields.find((candidate) => candidate.key === key)!;
      const result = await admin.supabase.from("runtime_values").upsert({ customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, record_id: recordId, field_id: field.id, ...typedValue(value) }, { onConflict: "record_id,field_id" });
      if (result.error) throw result.error;
    }
    await admin.supabase.from("runtime_record_events").insert({ customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, record_id: recordId, event_type: "record_updated", actor_user_id: resolved.user.id, payload: { entity: entity.key, fields: Object.keys(parsed.data.values) } });
    return NextResponse.json({ record: await readRecord(admin, entity.id, recordId, fields) });
  } catch (error) { return runtimeError(error); }
}
