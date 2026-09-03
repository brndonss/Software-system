import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { requireOwner } from "@/lib/auth";

type Context = { params: Promise<{ customerId: string }> };

export async function GET(_request: Request, context: Context) {
  const { customerId } = await context.params;
  const result = await requireOwner(customerId);
  if ("response" in result) return result.response;

  const { data: profiles, error } = await result.supabase
    .from("user_profiles")
    .select("id, customer_id, role, first_name, last_name, created_at, updated_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) return jsonError("Unable to load customer users", 500, "users_fetch_failed");
  return NextResponse.json({ users: profiles ?? [] });
}
