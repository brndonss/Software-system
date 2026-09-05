import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const leadSchema = z.object({
  leadName: z.string().trim().min(1).max(200),
  leadSource: z.enum(["website", "referral", "social", "paid_ads", "other"]).default("website"),
  status: z.enum(["new", "qualified", "follow_up", "closed"]).default("new"),
  notes: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase.from("business_leads").select("id, customer_id, lead_name, lead_source, status, notes, created_at, updated_at").eq("customer_id", resolved.customerId).order("created_at", { ascending: false });
  if (error) return jsonError("Unable to load leads", 500, "leads_fetch_failed");
  return NextResponse.json({ leads: data ?? [] });
}

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid lead data", 400, "invalid_lead");

  const admin = resolved.supabase;
  const { data, error } = await admin.from("business_leads").insert({
    customer_id: resolved.customerId,
    lead_name: parsed.data.leadName,
    lead_source: parsed.data.leadSource,
    status: parsed.data.status,
    notes: parsed.data.notes ?? null,
  }).select("id, customer_id, lead_name, lead_source, status, notes, created_at, updated_at").single();

  if (error || !data) return jsonError("Unable to create lead", 500, "lead_create_failed");

  await admin.from("business_activity_log").insert({
    customer_id: resolved.customerId,
    automation: "lead_follow_up",
    action: "lead_created",
    status: "completed",
    result_summary: `Lead created: ${parsed.data.leadName}`,
    approval_status: "approved",
  });

  return NextResponse.json({ lead: data }, { status: 201 });
}
