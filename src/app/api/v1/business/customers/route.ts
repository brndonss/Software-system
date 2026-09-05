import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const customerSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  status: z.enum(["active", "suspended", "archived"]).default("active"),
});

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase.from("customers").select("id, business_name, slug, status, created_at, updated_at").eq("id", resolved.customerId).single();
  if (error || !data) return jsonError("Customer not found", 404, "customer_not_found");
  return NextResponse.json({ customer: data });
}

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }

  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid customer data", 400, "invalid_customer");

  const { data, error } = await resolved.supabase.from("customers").update({ business_name: parsed.data.businessName, status: parsed.data.status }).eq("id", resolved.customerId).select("id, business_name, slug, status, created_at, updated_at").single();
  if (error || !data) return jsonError("Unable to update customer", 500, "customer_update_failed");
  return NextResponse.json({ customer: data }, { status: 200 });
}
