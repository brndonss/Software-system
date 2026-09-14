import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { canTransitionLead } from "@/lib/business/lifecycle";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/business/operations-service";
import { activitySummary, omitUndefined } from "@/lib/business/serializers";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import type { LeadStatus } from "@/lib/business/types";

const patchSchema = z.object({ leadName: z.string().trim().min(1).max(200).optional(), leadSource: z.enum(["website", "referral", "social", "paid_ads", "other"]).optional(), status: z.enum(["new", "qualified", "follow_up", "closed"]).optional(), notes: z.string().trim().max(2000).nullable().optional() });

export async function GET(_: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  const { leadId } = await params; const result = await getBusinessRecord(resolved.supabase, resolved.customerId, "leads", leadId);
  if (result.error) return jsonError("Unable to load lead", 500, "lead_fetch_failed"); if (!result.record) return jsonError("Lead not found", 404, "lead_not_found");
  return NextResponse.json({ lead: result.record });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  let body: unknown; try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }
  const parsed = patchSchema.safeParse(body); if (!parsed.success) return jsonError("Please provide valid lead updates", 400, "invalid_lead");
  const { leadId } = await params; const current = await getBusinessRecord(resolved.supabase, resolved.customerId, "leads", leadId);
  if (current.error) return jsonError("Unable to load lead", 500, "lead_fetch_failed"); if (!current.record) return jsonError("Lead not found", 404, "lead_not_found");
  if (parsed.data.status && !canTransitionLead(current.record.status as LeadStatus, parsed.data.status)) return jsonError("This lead cannot make that status transition", 409, "invalid_transition");
  const changes = omitUndefined({ lead_name: parsed.data.leadName, lead_source: parsed.data.leadSource, status: parsed.data.status, notes: parsed.data.notes });
  if (!Object.keys(changes).length) return jsonError("Provide at least one lead update", 400, "empty_update");
  const action = parsed.data.status ? "lead_status_changed" : parsed.data.notes !== undefined ? "lead_notes_updated" : "lead_updated";
  const result = await updateBusinessRecord(resolved.supabase, resolved.customerId, "leads", leadId, changes, { automation: "lead_management", action, resultSummary: activitySummary(action, String(current.record.lead_name)) });
  if (result.error) return jsonError("Unable to update lead", 500, "lead_update_failed"); if (!result.record) return jsonError("Lead not found", 404, "lead_not_found"); if (result.activityError) return jsonError("Lead updated but activity logging failed", 500, "activity_log_failed");
  return NextResponse.json({ lead: result.record });
}