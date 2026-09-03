import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function GET() {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const { data: profile, error } = await result.supabase
    .from("user_profiles")
    .select("id, customer_id, role, first_name, last_name, customers(id, business_name, slug, status)")
    .eq("id", result.user.id)
    .single();

  if (error || !profile) return jsonError("User profile not found", 404, "profile_not_found");
  return NextResponse.json({ user: result.user, profile });
}
