import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSystemBlueprint, validateSystemBlueprint } from "@/lib/ai/system-builder";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { jsonError } from "@/lib/api";
import { buildBlueprintGenerationContext } from "./context";

export const blueprintRequestSchema = z.object({
  businessDescription: z.string().trim().max(4000).optional(),
  sessionId: z.string().uuid().optional(),
}).strict();

const blueprintDraftSelect = "id, customer_id, workspace_id, onboarding_session_id, version, status, business_summary, extracted_facts, blueprint, validation_errors, created_at, updated_at";

export async function GET(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId || !z.string().uuid().safeParse(sessionId).success) return jsonError("A valid onboarding session is required", 422, "invalid_session_id");

  const { data, error } = await resolved.supabase
    .from("workspace_blueprints")
    .select(blueprintDraftSelect)
    .eq("onboarding_session_id", sessionId)
    .eq("customer_id", resolved.customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return jsonError("Unable to load the saved system draft", 500, "blueprint_fetch_failed");
  if (!data) return NextResponse.json({ draft: null });
  return NextResponse.json({ draft: data, blueprint: data.blueprint, validationErrors: [] });
}

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

  let sessionId = parsed.data.sessionId;
  let businessDescription = parsed.data.businessDescription ?? "";
  let sessionAnswers: { question_key: string; answer_json: unknown; normalized_facts: unknown }[] = [];
  if (sessionId) {
    const { data: session, error: sessionLookupError } = await resolved.supabase
      .from("onboarding_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("customer_id", resolved.customerId)
      .maybeSingle();

    if (sessionLookupError) return jsonError("Unable to validate the onboarding session", 500, "session_context_failed");
    if (!session) return jsonError("Onboarding session not found", 404, "session_not_found");

    const { data: answers, error: answersError } = await resolved.supabase
      .from("onboarding_answers")
      .select("question_key, answer_json, normalized_facts")
      .eq("onboarding_session_id", sessionId)
      .eq("customer_id", resolved.customerId)
      .eq("is_latest", true)
      .in("answer_status", ["answered", "updated"])
      .order("updated_at", { ascending: true });

    if (answersError) return jsonError("Unable to load the saved business understanding", 500, "answers_context_failed");
    sessionAnswers = answers ?? [];
    const persistedDescription = sessionAnswers
      .map((answer) => {
        const answerJson = answer.answer_json as { value?: unknown } | null;
        const value = answerJson?.value;
        return value === undefined ? null : `${answer.question_key}: ${typeof value === "string" ? value : JSON.stringify(value)}`;
      })
      .filter((answer): answer is string => Boolean(answer))
      .join("\n");
    if (persistedDescription.length >= 10) businessDescription = persistedDescription;
  }

  if (businessDescription.length < 10) {
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

  const existingContext = buildBlueprintGenerationContext({
    sessionId,
    onboardingData: onboardingData as Record<string, unknown> | null,
    onboardingSessions: onboardingSessions ?? [],
    sessionAnswers,
  });

  const blueprint = await generateSystemBlueprint({
    businessDescription,
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
      onboarding_session_id: sessionId ?? onboardingSessions?.[0]?.id ?? null,
      version: nextVersion,
      status: "draft",
      validation_status: "valid",
      validated_at: new Date().toISOString(),
      source: "onboarding",
      business_summary: {
        summary: validation.data.business.summary,
        vertical: validation.data.business.vertical,
        operational_focus: validation.data.business.operationalFocus,
      },
      extracted_facts: {
        description: businessDescription,
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
