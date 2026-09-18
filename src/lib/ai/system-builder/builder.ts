import { getFallbackConfiguration } from "@/lib/ai/fallback-config";
import { buildActionPlan } from "@/lib/ai/action-planner";
import { systemConfigurationSchema, type SystemConfiguration } from "@/lib/system-config/schema";
import { systemBlueprintSchema, type SystemBlueprint } from "./contract";
import { validateSystemBlueprint } from "./validator";

const provider = process.env.AI_PROVIDER ?? "openai";

export async function buildSystem(input: Record<string, unknown>, updateStatus: (status: "analyzing" | "generating" | "validating") => Promise<void>): Promise<SystemConfiguration> {
  if (provider !== "openai") throw new Error("Unsupported AI provider");
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  await updateStatus("analyzing");

  if (!apiKey) {
    const fallback = getFallbackConfiguration(input);
    await updateStatus("generating");
    await updateStatus("validating");
    return fallback;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4.1-mini",
      input: [{ role: "system", content: "Design a reusable SaaS workspace configuration from the customer profile. Return only JSON matching the requested schema. Never return code, SQL, secrets, URLs, or arbitrary executable actions. Use modules and workflow actions only from the approved catalog. The allowed modules are customers, leads, tasks, appointments, follow_ups, analytics. The allowed action types are create_task, send_notification, update_field. Do not invent unsupported modules or arbitrary action types." }, { role: "user", content: JSON.stringify({ ...input, actionPlanner: buildActionPlan(input) }) }],
      text: { format: { type: "json_object" } },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
  const result = await response.json() as { output_text?: string };
  if (!result.output_text) throw new Error("AI provider returned no configuration");

  await updateStatus("generating");
  const parsedJson: unknown = JSON.parse(result.output_text);
  await updateStatus("validating");
  return systemConfigurationSchema.parse(parsedJson);
}

const internalSystemPrompt = `You are Northstar's Business Systems Architect.
Your job is to understand how a real business operates and design a software system representing that business.
You are not a generic chatbot.
You are not allowed to execute code.
You are not allowed to execute SQL.
You do not directly modify production data.
You produce a structured business-system blueprint for a deterministic backend compiler.
Model capabilities, not industries.
Do not assume a business uses a CRM.
Do not create entities simply because they are common in another industry.
Every entity must have a reason to exist.
Every workflow must correspond to an actual business operation.
Every role must correspond to an actual responsibility.
Every view must provide operational value.
Preserve uncertainty instead of inventing facts.
If critical information is missing, request clarification.
The resulting AI agent must operate only through explicitly approved tools.
The AI agent must never bypass authentication, tenant isolation, RLS, permissions, business rules, validation, or required confirmation.
Return only structured blueprint data.`;

function sanitizeDescription(raw: string | undefined): string {
  const value = String(raw ?? "").trim();
  return value.length > 2000 ? value.slice(0, 2000) : value;
}

function inferEntities(description: string) {
  const lowered = description.toLowerCase();
  const entitySeed = [
    { key: "customers", label: "Customers", description: "People or organizations the business serves." },
    { key: "orders", label: "Orders", description: "Core commercial transactions or requests." },
    { key: "tasks", label: "Tasks", description: "Operational work requiring attention or completion." },
    { key: "team_members", label: "Team Members", description: "People responsible for executing work." },
    { key: "communications", label: "Communications", description: "Messages and status updates for stakeholders." },
  ];

  const matched = [] as typeof entitySeed;
  if (lowered.includes("lead") || lowered.includes("prospect")) matched.push({ key: "leads", label: "Leads", description: "Prospects or inbound opportunities requiring qualification." });
  if (lowered.includes("project") || lowered.includes("job") || lowered.includes("site")) matched.push({ key: "projects", label: "Projects", description: "Tracked work scopes or delivery efforts." });
  if (lowered.includes("inventory") || lowered.includes("stock") || lowered.includes("shipment")) matched.push({ key: "inventory_items", label: "Inventory Items", description: "Tracked items moving through operations." });
  if (lowered.includes("ticket") || lowered.includes("issue") || lowered.includes("case")) matched.push({ key: "tickets", label: "Tickets", description: "Issues or service requests needing resolution." });

  const merged = [...entitySeed, ...matched];
  return merged.filter((entity, index, arr) => arr.findIndex((item) => item.key === entity.key) === index).slice(0, 5);
}

export function buildFallbackSystemBlueprint(businessDescription: string, context: Record<string, unknown> = {}): SystemBlueprint {
  const cleaned = sanitizeDescription(businessDescription);
  const summary = cleaned || "Business description not yet detailed enough to produce a complete blueprint.";
  const contextRecord = context as Record<string, unknown>;
  const industryHint = String(contextRecord.vertical ?? contextRecord.businessVertical ?? "Operations").trim() || "Operations";
  const entities = inferEntities(summary).map((entity) => ({
    key: entity.key,
    label: entity.label,
    description: entity.description,
    fields: [
      { key: "name", label: "Name", type: "text" as const, required: true, unique: false },
      { key: "status", label: "Status", type: "select" as const, required: true, unique: false, options: ["new", "active", "in_progress", "complete", "paused"] },
      { key: "owner", label: "Owner", type: "text" as const, required: false, unique: false },
      { key: "notes", label: "Notes", type: "textarea" as const, required: false, unique: false },
    ],
  }));

  const workflowTriggers = ["record_created", "record_updated", "status_changed"] as const;
  const fallback: SystemBlueprint = {
    schemaVersion: 1,
    business: {
      summary,
      vertical: industryHint,
      operationalFocus: cleaned ? "Coordination, execution tracking, and accountability across the core operating process." : "Business operations need more detail before a complete workflow model can be finalized.",
    },
    entities: entities.length ? entities : [{
      key: "operating_records",
      label: "Operating Records",
      description: "Primary records representing the operating work being managed.",
      fields: [
        { key: "name", label: "Name", type: "text" as const, required: true, unique: false },
        { key: "status", label: "Status", type: "select" as const, required: true, unique: false, options: ["new", "active", "complete"] },
        { key: "owner", label: "Owner", type: "text" as const, required: false, unique: false },
      ],
    }],
    relationships: [
      { fromEntity: "customers", toEntity: "orders", relationshipType: "one-to-many" as const, label: "Customer orders" },
      { fromEntity: "team_members", toEntity: "tasks", relationshipType: "one-to-many" as const, label: "Assigned work" },
    ].filter((relationship) => entities.some((entity) => entity.key === relationship.fromEntity) && entities.some((entity) => entity.key === relationship.toEntity)),
    workflows: [
      {
        key: "core_workflow",
        name: "Core operating workflow",
        description: "Track the lifecycle from intake through completion and follow-up.",
        trigger: workflowTriggers[0],
        steps: [
          { key: "create_record", type: "create_record", description: "Create the initial operating record.", entity: entities[0]?.key ?? "operating_records" },
          { key: "assign_owner", type: "assign", description: "Assign an accountable team member.", entity: entities[2]?.key ?? "tasks" },
          { key: "update_status", type: "update_record", description: "Update status as progress is made.", entity: entities[0]?.key ?? "operating_records" },
        ],
      },
      {
        key: "follow_up_workflow",
        name: "Follow-up workflow",
        description: "Ensure work moves forward with escalation and communication when required.",
        trigger: workflowTriggers[1],
        steps: [
          { key: "notify_team", type: "notify", description: "Share an update with the responsible team.", entity: "communications" },
          { key: "create_task", type: "create_task", description: "Create a follow-up task when work needs additional handling.", entity: "tasks" },
        ],
      },
    ],
    roles: [
      { key: "owner", name: "Owner", description: "Owns the outcome and approves changes in business operations.", permissions: ["read", "update", "approve"] },
      { key: "operator", name: "Operator", description: "Delivers the operational work and updates records.", permissions: ["create", "read", "update", "assign"] },
    ],
    views: [
      { key: "operations_dashboard", name: "Operations dashboard", entity: entities[0]?.key ?? "operating_records", type: "dashboard" },
      { key: "task_board", name: "Task board", entity: "tasks", type: "board" },
    ],
    automations: [
      { key: "status_updates", trigger: workflowTriggers[2], actions: ["notify", "create_task"], conditions: ["status changed to in progress", "owner assigned"] },
    ],
    integrations: [
      { key: "communications_integration", provider: "email", capability: "notification", purpose: "Share operational updates with stakeholders" },
    ],
    agent: {
      name: "Operations Coordinator",
      persona: "Calm and process-focused operator who keeps work moving without bypassing required approvals.",
      mission: "Monitor core operational records, surface issues early, and guide the right people to action within approved business rules.",
      responsibilities: ["Review active records", "Flag exceptions", "Route tasks to the right owner", "Summarize status changes"],
      guardrails: ["Never bypass tenant boundaries or missing permissions", "Never claim a task succeeds without a validated update", "Never invent records or business facts"],
      allowedTools: ["read_customer_data", "search_records", "update_record", "create_task", "notify_team"],
      escalationRules: ["Escalate to an owner when risk or workflow exceptions are detected", "Request clarification when critical information is missing"],
    },
    assumptions: cleaned ? ["The business is operating in a dynamic environment and needs a structured operational system."] : ["The business description is still too sparse for a detailed operational model."],
    clarificationNeeded: cleaned.length < 60 ? ["Please provide more detail about the actual workflow, people involved, and business outcomes."] : [],
  };

  const validation = validateSystemBlueprint(fallback);
  if (!validation.ok) {
    throw new Error(`Fallback blueprint validation failed: ${validation.errors.join("; ")}`);
  }

  return validation.data as SystemBlueprint;
}

export async function generateSystemBlueprint(input: { businessDescription?: string; existingFacts?: Record<string, unknown>; onboarding?: Record<string, unknown> }) {
  const description = sanitizeDescription(input.businessDescription);
  const onboardingRecord = (input.onboarding ?? {}) as Record<string, unknown>;
  const existingFactsRecord = (input.existingFacts ?? {}) as Record<string, unknown>;
  const businessRecord = (existingFactsRecord.business ?? {}) as Record<string, unknown>;
  const fallback = buildFallbackSystemBlueprint(description, {
    vertical: onboardingRecord.business_niche ?? businessRecord.vertical ?? "Operations",
  });

  if (!process.env.OPENAI_API_KEY || process.env.AI_PROVIDER !== "openai") {
    return fallback;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4.1-mini",
        input: [{ role: "system", content: internalSystemPrompt }, { role: "user", content: JSON.stringify({ businessDescription: description, existingFacts: input.existingFacts ?? {}, onboarding: input.onboarding ?? {} }) }],
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return fallback;
    const data = await response.json() as { output_text?: string };
    if (!data.output_text) return fallback;

    const parsed = JSON.parse(data.output_text) as unknown;
    const validation = validateSystemBlueprint(parsed);
    if (!validation.ok) return fallback;
    return validation.data as SystemBlueprint;
  } catch {
    return fallback;
  }
}

export function blueprintSchemaFromFacts(raw: unknown): SystemBlueprint {
  const parsed = systemBlueprintSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }
  return parsed.data;
}
