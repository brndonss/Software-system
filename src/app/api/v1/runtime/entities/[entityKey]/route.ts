import { NextResponse } from "next/server";
import { resolveRuntimeRequest, runtimeError } from "@/lib/runtime/route";
import { assertRuntimePermission, loadEntity, loadFields, loadRuntimeMetadata, loadRuntimePermissions } from "@/lib/runtime/service";

export async function GET(request: Request, { params }: { params: Promise<{ entityKey: string }> }) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const { entityKey } = await params;
    const entity = await loadEntity(resolved.context, entityKey);
    const fields = await loadFields(resolved.context, entity.id);
    await assertRuntimePermission(resolved.context, entity.id, "read");
    const permissions = await loadRuntimePermissions(resolved.context);
    const entityRead = permissions.some((permission) => permission.entity_id === entity.id && permission.action === "read" && !permission.field_id);
    const permittedFields = entityRead ? fields : fields.filter((field) => permissions.some((permission) => permission.entity_id === entity.id && permission.field_id === field.id && permission.action === "read"));
    const metadata = await loadRuntimeMetadata(resolved.context);
    return NextResponse.json({
      workspaceId: resolved.context.workspaceId,
      deploymentId: resolved.context.deploymentId,
      entity,
      fields: permittedFields,
      relationships: metadata.relationships.filter((item) => item.from_entity_id === entity.id || item.to_entity_id === entity.id),
      permissions: metadata.permissions.filter((item) => item.entity_id === entity.id && (!item.field_id || permittedFields.some((field) => field.id === item.field_id))),
      views: metadata.views.filter((item) => item.entity_id === entity.id),
    });
  } catch (error) { return runtimeError(error); }
}
