import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { campaignUpdateForAction } from "@/lib/business/lifecycle";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/business/operations-service";
import { activitySummary, omitUndefined } from "@/lib/business/serializers";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const patchSchema = z.object({ action: z.enum(["submit_for_approval", "approve", "reject"]).optional(), title: z.string().trim().min(1).max(200).optional(), objective: z.string().trim().max(2000).nullable().optional(), targetAudience: z.string().trim().max(2000).nullable().optional(), adCopy: z.string().trim().max(5000).nullable().optional(), creativeConcept: z.string().trim().max(5000).nullable().optional(), suggestedBudget: z.string().trim().max(200).nullable().optional(), landingPageConcept: z.string().trim().max(2000).nullable().optional(), trackingPlan: z.string().trim().max(2000).nullable().optional() });

export async function GET(_: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  const { draftId } = await params; const result = await getBusinessRecord(resolved.supabase, resolved.customerId, "marketing", draftId);
  if (result.error) return jsonError("Unable to load campaign draft", 500, "campaign_fetch_failed"); if (!result.record) return jsonError("Campaign draft not found", 404, "campaign_not_found");
  return NextResponse.json({ draft: result.record });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  let body: unknown; try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }
  const parsed = patchSchema.safeParse(body); if (!parsed.success) return jsonError("Please provide valid campaign draft updates", 400, "invalid_campaign");
  const { draftId } = await params; const current = await getBusinessRecord(resolved.supabase, resolved.customerId, "marketing", draftId);
  if (current.error) return jsonError("Unable to load campaign draft", 500, "campaign_fetch_failed"); if (!current.record) return jsonError("Campaign draft not found", 404, "campaign_not_found");
  const editable = omitUndefined({ title: parsed.data.title, objective: parsed.data.objective, target_audience: parsed.data.targetAudience, ad_copy: parsed.data.adCopy, creative_concept: parsed.data.creativeConcept, suggested_budget: parsed.data.suggestedBudget, landing_page_concept: parsed.data.landingPageConcept, tracking_plan: parsed.data.trackingPlan });
  if (parsed.data.action && Object.keys(editable).length) return jsonError("Submit either a campaign action or content updates, not both", 400, "invalid_campaign_update");
  let changes = editable; let action = "campaign_draft_updated";
  if (parsed.data.action) { const update = campaignUpdateForAction(String(current.record.status), parsed.data.action); if (!update) return jsonError("This campaign cannot perform that action in its current state", 409, "invalid_transition"); changes = { status: update.status, approval_status: update.approval_status }; action = update.activity; }
  else if (!Object.keys(changes).length) return jsonError("Provide a campaign action or content update", 400, "empty_update");
  else if (current.record.status !== "draft" && current.record.status !== "rejected") return jsonError("Only draft or rejected campaigns can be edited", 409, "invalid_transition");
  const result = await updateBusinessRecord(resolved.supabase, resolved.customerId, "marketing", draftId, changes, { automation: "marketing_campaign", action, resultSummary: activitySummary(action, String(current.record.title)) });
  if (result.error) return jsonError("Unable to update campaign draft", 500, "campaign_update_failed"); if (!result.record) return jsonError("Campaign draft not found", 404, "campaign_not_found"); if (result.activityError) return jsonError("Campaign updated but activity logging failed", 500, "activity_log_failed");
  return NextResponse.json({ draft: result.record });
}