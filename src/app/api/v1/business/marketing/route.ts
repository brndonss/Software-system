import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const draftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().max(2000).optional(),
  targetAudience: z.string().trim().max(2000).optional(),
  adCopy: z.string().trim().max(5000).optional(),
  creativeConcept: z.string().trim().max(5000).optional(),
  suggestedBudget: z.string().trim().max(200).optional(),
  landingPageConcept: z.string().trim().max(2000).optional(),
  trackingPlan: z.string().trim().max(2000).optional(),
  status: z.enum(["draft", "pending_approval", "approved", "rejected", "published"]).default("draft"),
  approvalStatus: z.enum(["pending", "approved", "rejected", "paused", "completed", "failed"]).default("pending"),
});

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase.from("marketing_campaign_drafts").select("id, customer_id, title, objective, target_audience, ad_copy, creative_concept, suggested_budget, landing_page_concept, tracking_plan, status, approval_status, created_at, updated_at").eq("customer_id", resolved.customerId).order("created_at", { ascending: false });
  if (error) return jsonError("Unable to load campaign drafts", 500, "campaigns_fetch_failed");
  return NextResponse.json({ drafts: data ?? [] });
}

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid campaign draft data", 400, "invalid_campaign");

  const { data, error } = await resolved.supabase.from("marketing_campaign_drafts").insert({
    customer_id: resolved.customerId,
    title: parsed.data.title,
    objective: parsed.data.objective ?? null,
    target_audience: parsed.data.targetAudience ?? null,
    ad_copy: parsed.data.adCopy ?? null,
    creative_concept: parsed.data.creativeConcept ?? null,
    suggested_budget: parsed.data.suggestedBudget ?? null,
    landing_page_concept: parsed.data.landingPageConcept ?? null,
    tracking_plan: parsed.data.trackingPlan ?? null,
    status: parsed.data.status,
    approval_status: parsed.data.approvalStatus,
  }).select("id, customer_id, title, objective, target_audience, ad_copy, creative_concept, suggested_budget, landing_page_concept, tracking_plan, status, approval_status, created_at, updated_at").single();

  if (error || !data) return jsonError("Unable to create campaign draft", 500, "campaign_create_failed");
  return NextResponse.json({ draft: data }, { status: 201 });
}
