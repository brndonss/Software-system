import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSystemBlueprint, validateSystemBlueprint } from "@/lib/ai/system-builder";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { jsonError } from "@/lib/api";

const blueprintRequestSchema = z.object({
  businessDescription: z.string().trim().min(10).max(4000),
}).strict();

const blueprintDraftSelect = "id, customer_id, workspace_id, version, status, business_summary, extracted_facts, blueprint, validation_errors, created_at, updated_at";

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400, "invalid_payload");
  }

  const parsed = blueprintRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Please provide a clear business description to analyze.", 400, "invalid_blueprint_request");
  }

  const { data: onboardingData, error: onboardingError } = await resolved.supabase
    .from("customer_onboarding")
    .select("business_niche, business_size, services_products, current_software_tools, biggest_business_struggles, repetitive_tasks, desired_automations, software_goals, additional_information")
    .eq("customer_id", resolved.customerId)
    .maybeSingle();

  const { data: onboardingSessions, error: sessionError } = await resolved.supabase
    .from("onboarding_sessions")
    .select("id, metadata, last_question_key, created_at")
    .eq("customer_id", resolved.customerId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (onboardingError && onboardingError.code !== "PGRST116") {
    return jsonError("Unable to load onboarding context", 500, "onboarding_context_failed");
  }
  if (sessionError) {
    return jsonError("Unable to load onboarding session context", 500, "session_context_failed");
  }

  const existingContext = {
    business_niche: onboardingData?.business_niche ?? null,
    business_size: onboardingData?.business_size ?? null,
    services_products: onboardingData?.services_products ?? null,
    current_software_tools: onboardingData?.current_software_tools ?? null,
    biggest_business_struggles: onboardingData?.biggest_business_struggles ?? null,
    repetitive_tasks: onboardingData?.repetitive_tasks ?? null,
    desired_automations: onboardingData?.desired_automations ?? null,
    software_goals: onboardingData?.software_goals ?? null,
    additional_information: onboardingData?.additional_information ?? null,
    onboarding_sessions: onboardingSessions ?? [],
  };

  const blueprint = await generateSystemBlueprint({
    businessDescription: parsed.data.businessDescription,
    existingFacts: existingContext,
    onboarding: existingContext,
  });

  const validation = validateSystemBlueprint(blueprint);
  if (!validation.ok || !validation.data) {
    return NextResponse.json({
      draft: null,
      blueprint: blueprint,
      validationErrors: validation.errors,
      errors: validation.errors,
    }, { status: 422 });
  }

  const { data: draftWorkspace, error: workspaceError } = await resolved.supabase
    .from("workspaces")
    .select("id")
    .eq("customer_id", resolved.customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let workspaceId = draftWorkspace?.id ?? null;
  if (!workspaceId) {
    const { data: createdWorkspace, error: createWorkspaceError } = await resolved.supabase
      .from("workspaces")
      .insert({
        customer_id: resolved.customerId,
        name: "Northstar Workspace",
        status: "draft",
        created_by: resolved.user.id,
        metadata: { source: "system_builder" },
      })
      .select("id")
      .single();

    if (createWorkspaceError || !createdWorkspace) {
      return jsonError("Unable to create a draft workspace for this blueprint", 500, "workspace_create_failed");
    }
    workspaceId = createdWorkspace.id;
  }

  const { data: blueprintVersionRow } = await resolved.supabase
    .from("workspace_blueprints")
    .select("version")
    .eq("customer_id", resolved.customerId)
    .eq("workspace_id", workspaceId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (typeof blueprintVersionRow?.version === "number" ? blueprintVersionRow.version : 0) + 1;

  const { data: draft, error: draftError } = await resolved.supabase
    .from("workspace_blueprints")
    .insert({
      customer_id: resolved.customerId,
      workspace_id: workspaceId,
      onboarding_session_id: onboardingSessions?.[0]?.id ?? null,
      version: nextVersion,
      status: "draft",
      source: "onboarding",
      business_summary: {
        summary: validation.data.business.summary,
        vertical: validation.data.business.vertical,
        operational_focus: validation.data.business.operationalFocus,
      },
      extracted_facts: {
        description: parsed.data.businessDescription,
        onboarding: existingContext,
      },
      blueprint: validation.data,
      validation_errors: null,
      created_by: resolved.user.id,
    })
    .select(blueprintDraftSelect)
    .single();

  if (draftError || !draft) {
    return jsonError("Unable to save the draft blueprint", 500, "blueprint_save_failed");
  }

  return NextResponse.json({
    draft: {
      ...draft,
      blueprint: validation.data,
    },
    blueprint: validation.data,
    validationErrors: [],
  }, { status: 201 });
}
