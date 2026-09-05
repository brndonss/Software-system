import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function resolveCustomerIdFromSession() {
  const result = await requireUser();
  if ("response" in result) return { response: result.response };
  const { data: profile, error } = await result.supabase
    .from("user_profiles")
    .select("customer_id")
    .eq("id", result.user.id)
    .single();
  if (error || !profile) return { response: new Response(JSON.stringify({ error: { code: "profile_not_found", message: "User profile not found" } }), { status: 404, headers: { "Content-Type": "application/json" } }) };
  return { customerId: profile.customer_id, supabase: result.supabase, user: result.user };
}

export async function createActivityLog(customerId: string, automation: string, action: string, resultSummary: string, status: "pending" | "completed" | "failed" | "paused" = "completed", approvalStatus: "pending" | "approved" | "rejected" | "paused" | "completed" | "failed" = "approved") {
  const admin = createSupabaseAdminClient();
  await admin.from("business_activity_log").insert({ customer_id: customerId, automation, action, status, result_summary: resultSummary, approval_status: approvalStatus });
}
