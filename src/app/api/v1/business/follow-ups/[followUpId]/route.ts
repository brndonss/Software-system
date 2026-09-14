import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { canTransitionFollowUp } from "@/lib/business/lifecycle";
import { getBusinessRecord, updateBusinessRecord, validateFollowUpRelation } from "@/lib/business/operations-service";
import { activitySummary, omitUndefined } from "@/lib/business/serializers";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import type { FollowUpStatus } from "@/lib/business/types";

const patchSchema = z.object({ title: z.string().trim().min(1).max(200).optional(), relatedType: z.enum(["lead", "customer"]).optional(), relatedId: z.string().uuid().nullable().optional(), status: z.enum(["scheduled", "in_progress", "completed"]).optional(), scheduledFor: z.string().datetime({ offset: true }).nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() });

export async function GET(_: Request, { params }: { params: Promise<{ followUpId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  const { followUpId } = await params; const result = await getBusinessRecord(resolved.supabase, resolved.customerId, "followUps", followUpId);
  if (result.error) return jsonError("Unable to load follow-up", 500, "follow_up_fetch_failed"); if (!result.record) return jsonError("Follow-up not found", 404, "follow_up_not_found");
  return NextResponse.json({ followUp: result.record });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ followUpId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  let body: unknown; try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }
  const parsed = patchSchema.safeParse(body); if (!parsed.success) return jsonError("Please provide valid follow-up updates", 400, "invalid_follow_up");
  const { followUpId } = await params; const current = await getBusinessRecord(resolved.supabase, resolved.customerId, "followUps", followUpId);
  if (current.error) return jsonError("Unable to load follow-up", 500, "follow_up_fetch_failed"); if (!current.record) return jsonError("Follow-up not found", 404, "follow_up_not_found");
  if (parsed.data.status && !canTransitionFollowUp(current.record.status as FollowUpStatus, parsed.data.status)) return jsonError("This follow-up cannot make that status transition", 409, "invalid_transition");
  const relatedType = parsed.data.relatedType ?? String(current.record.related_type); const relatedId = parsed.data.relatedId !== undefined ? parsed.data.relatedId : current.record.related_id as string | null;
  if (parsed.data.relatedType !== undefined || parsed.data.relatedId !== undefined) { const relationError = await validateFollowUpRelation(resolved.supabase, resolved.customerId, relatedType, relatedId); if (relationError) return jsonError(relationError, 400, "invalid_related_record"); }
  const changes = omitUndefined({ title: parsed.data.title, related_type: parsed.data.relatedType, related_id: parsed.data.relatedId, status: parsed.data.status, scheduled_for: parsed.data.scheduledFor, notes: parsed.data.notes });
  if (!Object.keys(changes).length) return jsonError("Provide at least one follow-up update", 400, "empty_update");
  const action = parsed.data.status === "completed" ? "follow_up_completed" : parsed.data.status === "in_progress" ? "follow_up_started" : parsed.data.scheduledFor !== undefined ? "follow_up_rescheduled" : parsed.data.relatedId !== undefined || parsed.data.relatedType !== undefined ? "follow_up_relinked" : "follow_up_updated";
  const result = await updateBusinessRecord(resolved.supabase, resolved.customerId, "followUps", followUpId, changes, { automation: "follow_up_management", action, resultSummary: activitySummary(action, String(current.record.title)) });
  if (result.error) return jsonError("Unable to update follow-up", 500, "follow_up_update_failed"); if (!result.record) return jsonError("Follow-up not found", 404, "follow_up_not_found"); if (result.activityError) return jsonError("Follow-up updated but activity logging failed", 500, "activity_log_failed");
  return NextResponse.json({ followUp: result.record });
}