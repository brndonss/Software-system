import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { data: profile, error: profileError } = await result.supabase.from("user_profiles").select("customer_id").eq("id", result.user.id).single();
  if (profileError || !profile) return jsonError("User profile not found", 404, "profile_not_found");
  const { data: configuration, error } = await result.supabase.from("system_configurations").select("id, version, configuration, created_at").eq("customer_id", profile.customer_id).eq("is_active", true).single();
  if (error || !configuration) return jsonError("No completed system build found", 404, "configuration_not_found");
  return NextResponse.json({ configuration });
}
