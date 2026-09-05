import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const onboardingSchema = z.object({
  businessNiche: z.string().trim().min(1).max(200),
  businessSize: z.enum(["solo", "2-10", "11-50", "51-200", "201+"]),
  servicesProducts: z.string().trim().min(1).max(5000),
  currentSoftwareTools: z.string().trim().max(5000).optional().default(""),
  biggestBusinessStruggles: z.string().trim().max(5000).optional().default(""),
  repetitiveTasks: z.string().trim().max(5000).optional().default(""),
  desiredAutomations: z.string().trim().max(5000).optional().default(""),
  softwareGoals: z.string().trim().max(5000).optional().default(""),
  additionalInformation: z.string().trim().max(5000).optional().default(""),
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
});

const onboardingSelect = "id, customer_id, business_niche, business_size, services_products, current_software_tools, biggest_business_struggles, repetitive_tasks, desired_automations, software_goals, additional_information, status, completed_at, created_at, updated_at";

type OnboardingContext = { supabase: SupabaseClient; customerId: string };

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
    return jsonError("Request body must be valid JSON", 400);
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid onboarding information", 400);

  const isComplete = parsed.data.status === "completed";
  const payload = {
    customer_id: context.customerId,
    business_niche: parsed.data.businessNiche,
    business_size: parsed.data.businessSize,
    services_products: parsed.data.servicesProducts,
    current_software_tools: parsed.data.currentSoftwareTools,
    biggest_business_struggles: parsed.data.biggestBusinessStruggles,
    repetitive_tasks: parsed.data.repetitiveTasks,
    desired_automations: parsed.data.desiredAutomations,
    software_goals: parsed.data.softwareGoals,
    additional_information: parsed.data.additionalInformation,
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
