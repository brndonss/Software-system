import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const onboardingSchema = z.object({
  onboardingData: z.record(z.string(), z.any()).optional(),
  business: z.object({
    businessName: z.string().trim().optional(),
    industry: z.string().trim().optional(),
    subIndustry: z.string().trim().optional(),
    businessType: z.string().trim().optional(),
    yearsInBusiness: z.string().trim().optional(),
    employees: z.string().trim().optional(),
    locations: z.string().trim().optional(),
    serviceArea: z.string().trim().optional(),
    website: z.string().trim().optional(),
    description: z.string().trim().optional(),
  }).passthrough().optional(),
  customers: z.object({
    typicalCustomers: z.string().trim().optional(),
    customerSegment: z.string().trim().optional(),
    idealCustomer: z.string().trim().optional(),
    averageCustomerValue: z.string().trim().optional(),
    approximateCustomerCount: z.string().trim().optional(),
    customerAcquisition: z.string().trim().optional(),
    leadContactMethods: z.string().trim().optional(),
    salesProcess: z.string().trim().optional(),
  }).passthrough().optional(),
  operations: z.object({
    postSaleSteps: z.string().trim().optional(),
    customerJourney: z.string().trim().optional(),
    manualInfoMovement: z.string().trim().optional(),
    informationLoss: z.string().trim().optional(),
  }).passthrough().optional(),
  tools: z.object({
    software: z.array(z.string().trim()).optional(),
    softwareUses: z.record(z.string(), z.string().trim()).optional(),
    duplicateEntry: z.string().trim().optional(),
    manualTracking: z.string().trim().optional(),
  }).passthrough().optional(),
  problems: z.object({
    rankedProblems: z.array(z.string().trim()).optional(),
    customProblems: z.array(z.string().trim()).optional(),
    problemImpact: z.string().trim().optional(),
    problemCost: z.string().trim().optional(),
    attemptedFixes: z.string().trim().optional(),
    automationOpportunity: z.string().trim().optional(),
  }).passthrough().optional(),
  goals: z.object({
    topOutcomes: z.array(z.string().trim()).optional(),
    idealSixMonths: z.string().trim().optional(),
    worthPayingFor: z.string().trim().optional(),
  }).passthrough().optional(),
  automation: z.object({
    tasks: z.array(z.object({
      name: z.string().trim().optional(),
      frequency: z.string().trim().optional(),
      owner: z.string().trim().optional(),
      timeSpent: z.string().trim().optional(),
      systems: z.string().trim().optional(),
      mistakes: z.string().trim().optional(),
    }).passthrough()).optional(),
    automateMost: z.string().trim().optional(),
    additionalAutomation: z.string().trim().optional(),
  }).passthrough().optional(),
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
}).passthrough();

const onboardingSelect = "id, customer_id, business_niche, business_size, services_products, current_software_tools, biggest_business_struggles, repetitive_tasks, desired_automations, software_goals, additional_information, status, completed_at, created_at, updated_at, onboarding_data";

type OnboardingContext = { supabase: SupabaseClient; customerId: string };

function normalizeBusinessSize(value: string | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "solo";
  const normalized = trimmed.toLowerCase();
  if (/[0-9]/.test(normalized) && !normalized.includes("201")) {
    const parsed = Number.parseInt(normalized.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(parsed) && parsed <= 1) return "solo";
    if (parsed <= 10) return "2-10";
    if (parsed <= 50) return "11-50";
    if (parsed <= 200) return "51-200";
    return "201+";
  }
  if (["solo", "2-10", "11-50", "51-200", "201+"].includes(normalized)) return normalized;
  return "solo";
}

function buildSummary(payload: Record<string, unknown>) {
  const business = (payload.business as Record<string, unknown> | undefined) ?? {};
  const tools = (payload.tools as Record<string, unknown> | undefined) ?? {};
  const problems = (payload.problems as Record<string, unknown> | undefined) ?? {};
  const goals = (payload.goals as Record<string, unknown> | undefined) ?? {};
  const automation = (payload.automation as Record<string, unknown> | undefined) ?? {};

  const businessName = String(business.businessName ?? "").trim();
  const industry = String(business.industry ?? "").trim();
  const subIndustry = String(business.subIndustry ?? "").trim();
  const serviceArea = String(business.serviceArea ?? "").trim();
  const description = String(business.description ?? "").trim();
  const businessNiche = [businessName, industry, subIndustry].filter(Boolean).join(" ") || "local business";
  const servicesProducts = description || [business.businessType, business.serviceArea].filter(Boolean).join(" - ") || "Business services";
  const softwareTools = Array.isArray(tools.software) ? tools.software.join(", ") : String((tools as Record<string, unknown>).softwareList ?? "");
  const rankedProblems = Array.isArray(problems.rankedProblems) ? problems.rankedProblems.join("; ") : String(problems.biggestProblems ?? "");
  const repetitiveTasks = Array.isArray(automation.tasks) ? automation.tasks.map((task) => {
    const taskData = task as Record<string, unknown>;
    return [taskData.name, taskData.frequency, taskData.owner].filter(Boolean).join(" - ");
  }).filter(Boolean).join("; ") : String(automation.summary ?? "");
  const desiredAutomations = [String(automation.automateMost ?? "").trim(), String(automation.additionalAutomation ?? "").trim()].filter(Boolean).join("; ");
  const softwareGoals = Array.isArray(goals.topOutcomes) ? goals.topOutcomes.join("; ") : String(goals.primaryGoals ?? "");
  const additionalInformation = [serviceArea, String((payload.customers as Record<string, unknown> | undefined)?.salesProcess ?? "").trim()].filter(Boolean).join(" | ");

  return {
    businessNiche,
    businessSize: normalizeBusinessSize(String(business.employees ?? "")),
    servicesProducts,
    currentSoftwareTools: softwareTools,
    biggestBusinessStruggles: rankedProblems || String(problems.problemCost ?? ""),
    repetitiveTasks,
    desiredAutomations,
    softwareGoals: softwareGoals || String(goals.idealSixMonths ?? ""),
    additionalInformation: additionalInformation || String((payload as Record<string, unknown>).additionalInformation ?? ""),
  };
}

async function getContext(): Promise<OnboardingContext | NextResponse> {
  const result = await requireUser();
  if (!result.user) return result.response ?? jsonError("Authentication required", 401, "unauthorized");

  const { data: profile, error } = await result.supabase
    .from("user_profiles")
    .select("customer_id")
    .eq("id", result.user.id)
    .single();

  if (error || !profile) return jsonError("User profile not found", 404, "profile_not_found");
  return { supabase: result.supabase, customerId: profile.customer_id } as OnboardingContext;
}

export async function GET() {
  const context = await getContext();
  if (context instanceof NextResponse) return context;

  const { data, error } = await context.supabase
    .from("customer_onboarding")
    .select(onboardingSelect)
    .eq("customer_id", context.customerId)
    .maybeSingle();

  if (error) return jsonError("Unable to load onboarding", 500, "onboarding_fetch_failed");
  return NextResponse.json({ onboarding: data });
}

export async function PUT(request: Request) {
  const context = await getContext();
  if (context instanceof NextResponse) return context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400, "invalid_payload");
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid onboarding information", 400, "invalid_onboarding");

  const richData = (parsed.data.onboardingData && typeof parsed.data.onboardingData === "object" ? parsed.data.onboardingData : parsed.data) as Record<string, unknown>;
  const summary = buildSummary(richData);
  const isComplete = parsed.data.status === "completed";

  const payload = {
    customer_id: context.customerId,
    onboarding_data: richData,
    business_niche: summary.businessNiche,
    business_size: summary.businessSize,
    services_products: summary.servicesProducts,
    current_software_tools: summary.currentSoftwareTools,
    biggest_business_struggles: summary.biggestBusinessStruggles,
    repetitive_tasks: summary.repetitiveTasks,
    desired_automations: summary.desiredAutomations,
    software_goals: summary.softwareGoals,
    additional_information: summary.additionalInformation,
    status: parsed.data.status,
    completed_at: isComplete ? new Date().toISOString() : null,
  };

  const { data, error } = await context.supabase
    .from("customer_onboarding")
    .upsert(payload, { onConflict: "customer_id" })
    .select(onboardingSelect)
    .single();

  if (error) return jsonError("Unable to save onboarding", 500, "onboarding_save_failed");
  return NextResponse.json({ onboarding: data });
}
