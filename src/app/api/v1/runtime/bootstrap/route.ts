import { NextResponse } from "next/server";
import { resolveRuntimeRequest, runtimeError } from "@/lib/runtime/route";
import { loadRuntimeMetadata } from "@/lib/runtime/service";

export async function GET(request: Request) {
  const resolved = await resolveRuntimeRequest(request);
  if ("response" in resolved) return resolved.response;
  try {
    const metadata = await loadRuntimeMetadata(resolved.context);
    const entityRead = new Set(metadata.permissions.filter((permission) => permission.action === "read" && !permission.field_id).map((permission) => String(permission.entity_id)));
    const fieldRead = new Set(metadata.permissions.filter((permission) => permission.action === "read" && permission.field_id).map((permission) => String(permission.field_id)));
    const permittedEntities = metadata.entities.filter((entity) => entityRead.has(String(entity.id)) || metadata.permissions.some((permission) => permission.action === "read" && permission.entity_id === entity.id));
    const permittedEntityIds = new Set(permittedEntities.map((entity) => String(entity.id)));
    return NextResponse.json({
      workspaceId: resolved.context.workspaceId,
      deploymentId: resolved.context.deploymentId,
      runtimeSchemaVersion: resolved.context.deployment.runtime_schema_version,
      entities: permittedEntities,
      fields: metadata.fields.filter((field) => permittedEntityIds.has(String(field.entity_id)) && (entityRead.has(String(field.entity_id)) || fieldRead.has(String(field.id)))),
      relationships: metadata.relationships.filter((relationship) => permittedEntityIds.has(String(relationship.from_entity_id)) && permittedEntityIds.has(String(relationship.to_entity_id))),
      roles: metadata.roles,
      permissions: metadata.permissions.filter((permission) => permittedEntityIds.has(String(permission.entity_id))),
      workflows: metadata.workflows,
      views: metadata.views.filter((view) => !view.entity_id || permittedEntityIds.has(String(view.entity_id))),
      automations: metadata.automations,
      integrations: metadata.integrations,
      reports: metadata.reports,
      agents: metadata.agents,
    });
  } catch (error) { return runtimeError(error); }
}
