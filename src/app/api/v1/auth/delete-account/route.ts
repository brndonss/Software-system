import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function DELETE() {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await result.supabase
    .from("user_profiles")
    .select("customer_id")
    .eq("id", result.user.id)
    .single();

  if (profileError || !profile) {
    return jsonError("User profile not found", 404, "profile_not_found");
  }

  const { data: deleted, error: cleanupError } = await admin.rpc("delete_customer_account_for_user", {
    target_user_id: result.user.id,
  });

  if (cleanupError || deleted === false) {
    return jsonError("Unable to fully remove this account. Please contact support.", 500, "account_cleanup_failed");
  }

  const { error: authError } = await admin.auth.admin.deleteUser(result.user.id);
  if (authError) {
    return jsonError(authError.message || "Database error deleting user", 500, "account_delete_failed");
  }

  return NextResponse.json({ success: true });
}
