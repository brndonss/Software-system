import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { requireOwner } from "@/lib/auth";

const updateSchema = z.object({ businessName: z.string().trim().min(1).max(200).optional() }).strict();

type Context = { params: Promise<{ customerId: string }> };

export async function GET(_request: Request, context: Context) {
  const { customerId } = await context.params;
  const result = await requireOwner(customerId);
  if ("response" in result) return result.response;

  const { data: customer, error } = await result.supabase
    .from("customers")
    .select("id, business_name, slug, status, created_at, updated_at")
    .eq("id", customerId)
    .single();

  if (error || !customer) return jsonError("Customer not found", 404, "customer_not_found");
  return NextResponse.json({ customer });
}

export async function PATCH(request: Request, context: Context) {
  const { customerId } = await context.params;
  const result = await requireOwner(customerId);
  if ("response" in result) return result.response;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success || Object.keys(parsed.data).length === 0) return jsonError("A business name is required", 400);

  const { data: customer, error } = await result.supabase
    .from("customers")
    .update({ business_name: parsed.data.businessName })
    .eq("id", customerId)
    .select("id, business_name, slug, status, created_at, updated_at")
    .single();

  if (error || !customer) return jsonError("Unable to update customer", 400, "customer_update_failed");
  return NextResponse.json({ customer });
}
