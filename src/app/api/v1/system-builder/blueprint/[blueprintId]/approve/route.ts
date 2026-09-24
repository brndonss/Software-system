import { jsonError } from "@/lib/api";
import { blueprintTransitionRequestSchema } from "@/lib/system-builder/blueprint-lifecycle";
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
  const parsed = blueprintTransitionRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("A valid expected blueprint version is required", 422, "invalid_transition_request");

  const { data, error } = await resolved.supabase.rpc("approve_workspace_blueprint", {
    p_blueprint_id: resolved.blueprint.id,
    p_expected_version: parsed.data.expectedVersion,
    p_review_notes: null,
  });
  if (error || !data) return lifecycleError(error, "Unable to approve blueprint");
  return transitionResponse(data);
}
