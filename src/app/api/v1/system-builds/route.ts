import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { buildSystem } from "@/lib/ai/system-builder";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const buildSelect = "id, customer_id, status, attempt_count, error_code, error_message, started_at, completed_at, created_at, updated_at";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }
  const customerId = typeof body === "object" && body !== null && "customerId" in body && typeof body.customerId === "string" ? body.customerId : "";
  if (!customerId) return jsonError("Customer ID is required", 400);

  const result = await requireOwner(customerId);
  if ("response" in result) return result.response;

  const { data: onboarding, error: onboardingError } = await result.supabase
    .from("customer_onboarding")
    .select("business_niche, business_size, services_products, current_software_tools, biggest_business_struggles, repetitive_tasks, desired_automations, software_goals, additional_information, status")
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .single();
  if (onboardingError || !onboarding) return jsonError("Complete onboarding before building your system", 400, "onboarding_incomplete");

  const { data: existing } = await result.supabase.from("system_builds").select(buildSelect).eq("customer_id", customerId).in("status", ["queued", "analyzing", "generating", "validating"]).maybeSingle();
  if (existing) return NextResponse.json({ build: existing });

  const { data: build, error } = await result.supabase.from("system_builds").insert({ customer_id: customerId, requested_by: result.user.id }).select(buildSelect).single();
  if (error || !build) return jsonError("Unable to start system build", 500, "build_create_failed");

  void processBuild(build.id, customerId, onboarding);
  return NextResponse.json({ build }, { status: 202 });
}

export async function GET(request: Request) {
  const customerId = new URL(request.url).searchParams.get("customerId") ?? "";
  if (!customerId) return jsonError("Customer ID is required", 400);
  const result = await requireOwner(customerId);
  if ("response" in result) return result.response;
  const { data: builds, error } = await result.supabase.from("system_builds").select(buildSelect).eq("customer_id", customerId).order("created_at", { ascending: false }).limit(10);
  if (error) return jsonError("Unable to load system builds", 500, "builds_fetch_failed");
  return NextResponse.json({ builds: builds ?? [] });
}

async function processBuild(buildId: string, customerId: string, onboarding: Record<string, unknown>) {
  const admin = createSupabaseAdminClient();
  const updateStatus = async (status: string) => { await admin.from("system_builds").update({ status, started_at: status === "analyzing" ? new Date().toISOString() : undefined }).eq("id", buildId); };
  try {
    const configuration = await buildSystem({ customerId, onboarding }, updateStatus);
    const { data: version } = await admin.rpc("next_system_configuration_version", { target_customer_id: customerId });
    if (!version) throw new Error("Unable to create configuration version");
    await admin.from("system_configurations").update({ is_active: false }).eq("customer_id", customerId).eq("is_active", true);
    const { error: configurationError } = await admin.from("system_configurations").insert({ customer_id: customerId, build_id: buildId, version, configuration, is_active: true });
    if (configurationError) throw configurationError;
    await admin.from("system_builds").update({ status: "completed", completed_at: new Date().toISOString(), attempt_count: 1 }).eq("id", buildId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "System build failed";
    await admin.from("system_builds").update({ status: "failed", error_code: "build_failed", error_message: message.slice(0, 500), attempt_count: 1 }).eq("id", buildId);
  }
}
