import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { validateSystemBlueprint } from "@/lib/ai/system-builder";
import { sessionIdParamSchema } from "@/lib/ai/interview-contracts";

export async function resolveBlueprintTransition(
  params: Promise<{ blueprintId: string }>,
) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return { response: resolved.response } as const;

  const parsedParams = sessionIdParamSchema.safeParse({ sessionId: (await params).blueprintId });
  if (!parsedParams.success) return { response: jsonError("Invalid blueprint ID", 422, "invalid_blueprint_id") } as const;

  const { data: blueprint, error } = await resolved.supabase
    .from("workspace_blueprints")
    .select("id, customer_id, workspace_id, version, status, validation_status, blueprint")
    .eq("id", parsedParams.data.sessionId)
    .eq("customer_id", resolved.customerId)
    .maybeSingle();

  if (error) return { response: jsonError("Unable to load blueprint", 500, "blueprint_fetch_failed") } as const;
  if (!blueprint) return { response: jsonError("Blueprint not found", 404, "blueprint_not_found") } as const;

  const validation = validateSystemBlueprint(blueprint.blueprint);
  if (!validation.ok) return { response: jsonError("Blueprint validation failed", 422, "invalid_blueprint") } as const;

  return { ...resolved, blueprint: blueprint as { id: string; customer_id: string; workspace_id: string; version: number; status: string; validation_status: string; blueprint: unknown } } as const;
}

export function lifecycleError(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === "42501") return jsonError("You cannot modify this blueprint", 403, "forbidden");
  if (error?.code === "P0002") return jsonError("Blueprint not found", 404, "blueprint_not_found");
  if (error?.code === "P0003") return jsonError(error.message ?? "Blueprint status does not allow this transition", 409, "invalid_blueprint_transition");
  if (error?.code === "P0004") return jsonError("Blueprint version is stale. Reload before continuing.", 409, "blueprint_version_conflict");
  if (error?.code === "P0005") return jsonError("Blueprint must be validated before this transition", 422, "invalid_blueprint");
  if (error?.code === "P0006") return jsonError("Rejection notes are required", 422, "rejection_notes_required");
  return jsonError(fallback, 500, "blueprint_transition_failed");
}

export function transitionResponse(data: unknown) {
  const blueprint = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ blueprint });
}
