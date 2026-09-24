import { jsonError } from "@/lib/api";
import { rejectBlueprintRequestSchema } from "@/lib/system-builder/blueprint-lifecycle";
import {
  lifecycleError,
  resolveBlueprintTransition,
  transitionResponse,
} from "@/lib/system-builder/blueprint-lifecycle-route";

export async function POST(request: Request, { params }: { params: Promise<{ blueprintId: string }> }) {
  const resolved = await resolveBlueprintTransition(params);
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400, "invalid_payload"); }
  const parsed = rejectBlueprintRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Rejection notes and a valid expected version are required", 422, "invalid_rejection_request");

  const { data, error } = await resolved.supabase.rpc("reject_workspace_blueprint", {
    p_blueprint_id: resolved.blueprint.id,
    p_expected_version: parsed.data.expectedVersion,
    p_review_notes: parsed.data.reviewNotes,
  });
  if (error || !data) return lifecycleError(error, "Unable to reject blueprint");
  return transitionResponse(data);
}
