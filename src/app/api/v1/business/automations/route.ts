import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const automationSchema = z.object({
  automationKey: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  problem: z.string().trim().max(2000).optional(),
  workflow: z.string().trim().max(2000).optional(),
  enabled: z.boolean().default(false),
  status: z.enum(["recommended", "active", "paused", "rejected"]).default("recommended"),
  approvalStatus: z.enum(["pending", "approved", "rejected", "paused", "completed", "failed"]).default("pending"),
});

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase.from("business_automations").select("id, customer_id, automation_key, title, description, problem, workflow, status, enabled, approval_status, created_at, updated_at").eq("customer_id", resolved.customerId).order("created_at", { ascending: false });
  if (error) return jsonError("Unable to load automations", 500, "automations_fetch_failed");
  return NextResponse.json({ automations: data ?? [] });
}

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }

  const parsed = automationSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid automation data", 400, "invalid_automation");

  const { data, error } = await resolved.supabase.from("business_automations").insert({
    customer_id: resolved.customerId,
    automation_key: parsed.data.automationKey,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    problem: parsed.data.problem ?? null,
    workflow: parsed.data.workflow ?? null,
    enabled: parsed.data.enabled,
    status: parsed.data.status,
    approval_status: parsed.data.approvalStatus,
  }).select("id, customer_id, automation_key, title, description, problem, workflow, status, enabled, approval_status, created_at, updated_at").single();

  if (error || !data) return jsonError("Unable to create automation", 500, "automation_create_failed");
  return NextResponse.json({ automation: data }, { status: 201 });
}
