import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const followUpSchema = z.object({
  title: z.string().trim().min(1).max(200),
  relatedType: z.enum(["lead", "customer"]).default("lead"),
  relatedId: z.string().uuid().optional().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed"]).default("scheduled"),
  scheduledFor: z.string().datetime({ offset: true }).optional().nullable(),
  notes: z.string().trim().max(4000).optional(),
});

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase.from("business_follow_ups").select("id, customer_id, related_type, related_id, title, status, scheduled_for, notes, created_at, updated_at").eq("customer_id", resolved.customerId).order("created_at", { ascending: false });
  if (error) return jsonError("Unable to load follow-ups", 500, "followups_fetch_failed");
  return NextResponse.json({ followUps: data ?? [] });
}

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }

  const parsed = followUpSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid follow-up data", 400, "invalid_follow_up");

  const { data, error } = await resolved.supabase.from("business_follow_ups").insert({
    customer_id: resolved.customerId,
    related_type: parsed.data.relatedType,
    related_id: parsed.data.relatedId ?? null,
    title: parsed.data.title,
    status: parsed.data.status,
    scheduled_for: parsed.data.scheduledFor ?? null,
    notes: parsed.data.notes ?? null,
  }).select("id, customer_id, related_type, related_id, title, status, scheduled_for, notes, created_at, updated_at").single();

  if (error || !data) return jsonError("Unable to create follow-up", 500, "follow_up_create_failed");
  return NextResponse.json({ followUp: data }, { status: 201 });
}
