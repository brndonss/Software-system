import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase.from("business_activity_log").select("id, automation, action, status, result_summary, approval_status, created_at").eq("customer_id", resolved.customerId).order("created_at", { ascending: false }).limit(50);
  if (error) return jsonError("Unable to load activity log", 500, "activity_fetch_failed");
  return NextResponse.json({ activities: data ?? [] });
}
