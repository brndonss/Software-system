import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { adminContext, resolveRuntimeRequest, runtimeError } from "@/lib/runtime/route";
import { loadEntity, RuntimeServiceError } from "@/lib/runtime/service";

async function loadRelationship(context: ReturnType<typeof adminContext>, entityId: string, relationshipKey: string) {
  const result = await context.supabase.from("runtime_relationships").select("*").eq("workspace_id", context.workspaceId).eq("deployment_id", context.deploymentId).eq("customer_id", context.customerId).or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
  if (result.error) throw result.error;
  const relationship = (result.data ?? []).find((item) => String(item.id) === relationshipKey || String(item.label) === relationshipKey || `${item.from_entity_id}:${item.to_entity_id}` === relationshipKey);
  if (!relationship) throw new RuntimeServiceError("unknown_relationship", "Relationship not found", 404);
  return relationship as Record<string, unknown>;
}

export async function GET(request: Request, { params }: { params: Promise<{ entityKey: string; recordId: string; relationshipKey: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey, recordId, relationshipKey } = await params;
    const entity = await loadEntity(resolved.context, entityKey);
    const relationship = await loadRelationship(adminContext(resolved.context), entity.id, relationshipKey);
    const result = await resolved.context.supabase.from("runtime_record_relationships").select("id, from_record_id, to_record_id, created_at").eq("workspace_id", resolved.context.workspaceId).eq("deployment_id", resolved.context.deploymentId).eq("customer_id", resolved.context.customerId).eq("relationship_id", relationship.id).or(`from_record_id.eq.${recordId},to_record_id.eq.${recordId}`);
    if (result.error) throw result.error;
    return NextResponse.json({ relationship, links: result.data ?? [] });
  } catch (error) { return runtimeError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ entityKey: string; recordId: string; relationshipKey: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey, recordId, relationshipKey } = await params;
    const body = await request.json() as { targetRecordId?: string };
    if (!body.targetRecordId) return jsonError("targetRecordId is required", 422, "invalid_relationship_payload");
    const entity = await loadEntity(resolved.context, entityKey);
    const admin = adminContext(resolved.context);
    const relationship = await loadRelationship(admin, entity.id, relationshipKey);
    const records = await admin.supabase.from("runtime_records").select("id").eq("workspace_id", resolved.context.workspaceId).eq("deployment_id", resolved.context.deploymentId).eq("customer_id", resolved.context.customerId).in("id", [recordId, body.targetRecordId]).is("deleted_at", null);
    if (records.error) throw records.error;
    if ((records.data ?? []).length !== 2) throw new RuntimeServiceError("invalid_relationship", "Both records must belong to the active deployment", 422);
    const link = await admin.supabase.from("runtime_record_relationships").upsert({ customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, relationship_id: relationship.id, from_record_id: recordId, to_record_id: body.targetRecordId }, { onConflict: "relationship_id,from_record_id,to_record_id" }).select("id, from_record_id, to_record_id, created_at").single();
    if (link.error || !link.data) throw link.error ?? new Error("relationship_create_failed");
    await admin.supabase.from("runtime_record_events").insert({ customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, record_id: recordId, event_type: "relationship_created", actor_user_id: resolved.user.id, payload: { relationshipId: relationship.id, targetRecordId: body.targetRecordId } });
    return NextResponse.json({ link: link.data }, { status: 201 });
  } catch (error) { return runtimeError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entityKey: string; recordId: string; relationshipKey: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey, recordId, relationshipKey } = await params;
    const targetRecordId = new URL(request.url).searchParams.get("targetRecordId");
    if (!targetRecordId) return jsonError("targetRecordId is required", 422, "invalid_relationship_payload");
    const entity = await loadEntity(resolved.context, entityKey);
    const admin = adminContext(resolved.context);
    const relationship = await loadRelationship(admin, entity.id, relationshipKey);
    const result = await admin.supabase.from("runtime_record_relationships").delete().eq("workspace_id", resolved.context.workspaceId).eq("deployment_id", resolved.context.deploymentId).eq("customer_id", resolved.context.customerId).eq("relationship_id", relationship.id).eq("from_record_id", recordId).eq("to_record_id", targetRecordId);
    if (result.error) throw result.error;
    await admin.supabase.from("runtime_record_events").insert({ customer_id: resolved.context.customerId, workspace_id: resolved.context.workspaceId, deployment_id: resolved.context.deploymentId, record_id: recordId, event_type: "relationship_deleted", actor_user_id: resolved.user.id, payload: { relationshipId: relationship.id, targetRecordId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return runtimeError(error); }
}
