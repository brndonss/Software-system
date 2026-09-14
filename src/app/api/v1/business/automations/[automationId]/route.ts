import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { automationUpdateForAction } from "@/lib/business/lifecycle";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/business/operations-service";
import { activitySummary } from "@/lib/business/serializers";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const patchSchema = z.object({ action: z.enum(["approve", "activate", "pause", "reject"]) });

export async function GET(_: Request, { params }: { params: Promise<{ automationId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  const { automationId } = await params; const result = await getBusinessRecord(resolved.supabase, resolved.customerId, "automations", automationId);
  if (result.error) return jsonError("Unable to load automation", 500, "automation_fetch_failed"); if (!result.record) return jsonError("Automation not found", 404, "automation_not_found");
  return NextResponse.json({ automation: result.record });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ automationId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  let body: unknown; try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }
  const parsed = patchSchema.safeParse(body); if (!parsed.success) return jsonError("Provide a valid automation action", 400, "invalid_automation_action");
  const { automationId } = await params; const current = await getBusinessRecord(resolved.supabase, resolved.customerId, "automations", automationId);
  if (current.error) return jsonError("Unable to load automation", 500, "automation_fetch_failed"); if (!current.record) return jsonError("Automation not found", 404, "automation_not_found");
  const update = automationUpdateForAction(String(current.record.status), String(current.record.approval_status), parsed.data.action);
  if (!update) return jsonError("This automation cannot perform that action in its current state", 409, "invalid_transition");
  const result = await updateBusinessRecord(resolved.supabase, resolved.customerId, "automations", automationId, { status: update.status, approval_status: update.approval_status, enabled: update.enabled }, { automation: String(current.record.automation_key), action: update.activity, resultSummary: activitySummary(update.activity, String(current.record.title)) });
  if (result.error) return jsonError("Unable to update automation", 500, "automation_update_failed"); if (!result.record) return jsonError("Automation not found", 404, "automation_not_found"); if (result.activityError) return jsonError("Automation updated but activity logging failed", 500, "activity_log_failed");
  return NextResponse.json({ automation: result.record });
}