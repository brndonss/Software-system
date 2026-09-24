import { NextResponse } from "next/server";
import { activateDeployment } from "@/lib/runtime/activation";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { runtimeError } from "@/lib/runtime/route";
import { RuntimeServiceError } from "@/lib/runtime/service";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ deploymentId: string }> }) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;
  try {
    const { deploymentId } = await params;
    const admin = createSupabaseAdminClient();
    const deployment = await admin.from("workspace_deployments").select("id, workspace_id, customer_id").eq("id", deploymentId).eq("customer_id", resolved.customerId).maybeSingle();
    if (deployment.error || !deployment.data) return runtimeError(new RuntimeServiceError("deployment_not_found", "Deployment not found", 404));
    const context = { customerId: resolved.customerId, workspaceId: String(deployment.data.workspace_id), deploymentId, deployment: deployment.data as Record<string, unknown>, supabase: resolved.supabase };
    const result = await activateDeployment(context, deploymentId, resolved.user.id);
    return NextResponse.json({ activation: result });
  } catch (error) { return runtimeError(error); }
}
