import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { adminContext, resolveRuntimeRequest, runtimeError } from "@/lib/runtime/route";
import { assertRuntimePermission, loadEntity, loadFields, matchingRecordIds, parseFilters, runtimeRecordPayloadSchema, safeProjection, RuntimeServiceError, typedValue, validateReferenceValues, validateValues } from "@/lib/runtime/service";

function decodeCursor(value: string | null): { updatedAt: string; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { updatedAt?: string; id?: string };
    if (!parsed.updatedAt || !parsed.id) throw new Error();
    return { updatedAt: parsed.updatedAt, id: parsed.id };
  } catch { throw new RuntimeServiceError("invalid_cursor", "Cursor is invalid", 422); }
}

function encodeCursor(value: { updatedAt: string; id: string }) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }

function valueFromRow(row: Record<string, unknown>): unknown {
  if (row.text_value !== null && row.text_value !== undefined) return row.text_value;
  if (row.number_value !== null && row.number_value !== undefined) return row.number_value;
  if (row.boolean_value !== null && row.boolean_value !== undefined) return row.boolean_value;
  if (row.date_value !== null && row.date_value !== undefined) return row.date_value;
  return row.json_value;
}

async function loadRecordValues(context: ReturnType<typeof adminContext>, recordIds: string[]) {
  if (!recordIds.length) return new Map<string, Record<string, unknown>>();
  const result = await context.supabase.from("runtime_values").select("record_id, field_id, text_value, number_value, boolean_value, date_value, json_value").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).in("record_id", recordIds);
  if (result.error) throw result.error;
  const values = new Map<string, Record<string, unknown>>();
  for (const item of (result.data ?? []) as Record<string, unknown>[]) {
    const record = values.get(String(item.record_id)) ?? {};
    record[String(item.field_id)] = valueFromRow(item);
    values.set(String(item.record_id), record);
  }
  return values;
}

export async function GET(request: Request, { params }: { params: Promise<{ entityKey: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey } = await params;
    const entity = await loadEntity(resolved.context, entityKey);
    const fields = await loadFields(resolved.context, entity.id);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25), 1), 100);
    const cursor = decodeCursor(url.searchParams.get("cursor"));
    const projection = safeProjection(url.searchParams.get("fields"), fields);
    await assertRuntimePermission(resolved.context, entity.id, "read");
    for (const field of projection) await assertRuntimePermission(resolved.context, entity.id, "read", field.id);
    const filters = parseFilters(url.searchParams.get("filters"));
    const matchingIds = await matchingRecordIds(resolved.context, entity.id, fields, filters);
    if (matchingIds && matchingIds.length === 0) return NextResponse.json({ entity, fields: projection, records: [], nextCursor: null });
    let query = resolved.context.supabase.from("runtime_records").select("id, record_key, record_version, created_by, updated_by, created_at, updated_at").eq("workspace_id", resolved.context.workspaceId).eq("deployment_id", resolved.context.deploymentId).eq("customer_id", resolved.context.customerId).eq("entity_id", entity.id).is("deleted_at", null).order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
    if (matchingIds) query = query.in("id", matchingIds);
    if (cursor) query = query.or(`updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`);
    if (url.searchParams.get("q")) query = query.ilike("record_key", `%${url.searchParams.get("q")}%`);
    const result = await query;
    if (result.error) throw result.error;
    const rawRecords = (result.data ?? []) as Record<string, unknown>[];
    const hasMore = rawRecords.length > limit;
    const records = rawRecords.slice(0, limit);
    const valueRows = await resolved.context.supabase.from("runtime_values").select("record_id, field_id, text_value, number_value, boolean_value, date_value, json_value").eq("workspace_id", resolved.context.workspaceId).eq("deployment_id", resolved.context.deploymentId).eq("customer_id", resolved.context.customerId).in("record_id", records.map((record) => String(record.id)));
    if (valueRows.error) throw valueRows.error;
    const fieldById = new Map(fields.map((field) => [field.id, field]));
    const selected = new Set(projection.map((field) => field.id));
    const valuesByRecord = new Map<string, Record<string, unknown>>();
    for (const item of (valueRows.data ?? []) as Record<string, unknown>[]) {
      if (!selected.has(String(item.field_id))) continue;
      const field = fieldById.get(String(item.field_id));
      if (!field) continue;
      const recordValues = valuesByRecord.get(String(item.record_id)) ?? {};
      recordValues[field.key] = valueFromRow(item);
      valuesByRecord.set(String(item.record_id), recordValues);
    }
    const output = records.map((record) => ({ id: record.id, recordKey: record.record_key, recordVersion: record.record_version, createdAt: record.created_at, updatedAt: record.updated_at, values: valuesByRecord.get(String(record.id)) ?? {} }));
    const last = records.at(-1);
    return NextResponse.json({ entity, fields: projection, records: output, nextCursor: hasMore && last ? encodeCursor({ updatedAt: String(last.updated_at), id: String(last.id) }) : null });
  } catch (error) { return runtimeError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ entityKey: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey } = await params;
    const entity = await loadEntity(resolved.context, entityKey);
    const fields = await loadFields(resolved.context, entity.id);
    const parsed = runtimeRecordPayloadSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Record payload is invalid", 422, "invalid_record_payload");
    validateValues(fields, parsed.data.values, true);
    await assertRuntimePermission(resolved.context, entity.id, "create");
    for (const field of fields.filter((candidate) => parsed.data.values[candidate.key] !== undefined)) await assertRuntimePermission(resolved.context, entity.id, "create", field.id);
    const admin = adminContext(resolved.context);
    await validateReferenceValues(admin, fields, parsed.data.values);
    const record = await admin.supabase.from("runtime_records").insert({ customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, entity_id: entity.id, record_key: parsed.data.recordKey ?? crypto.randomUUID(), created_by: resolved.user.id, updated_by: resolved.user.id }).select("id, record_key, record_version, created_at, updated_at").single();
    if (record.error || !record.data) throw record.error ?? new Error("record_create_failed");
    const recordId = String(record.data.id);
    const inserts = Object.entries(parsed.data.values).map(([key, value]) => { const field = fields.find((candidate) => candidate.key === key)!; return { customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, record_id: recordId, field_id: field.id, ...typedValue(value) }; });
    if (inserts.length) { const values = await admin.supabase.from("runtime_values").insert(inserts); if (values.error) throw values.error; }
    await admin.supabase.from("runtime_record_events").insert({ customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, record_id: recordId, event_type: "record_created", actor_user_id: resolved.user.id, payload: { entity: entity.key } });
    return NextResponse.json({ record: { ...record.data, values: parsed.data.values } }, { status: 201 });
  } catch (error) { return runtimeError(error); }
}
