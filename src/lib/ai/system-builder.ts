import { getFallbackConfiguration } from "@/lib/ai/fallback-config";
import { buildActionPlan } from "@/lib/ai/action-planner";
import { systemConfigurationSchema, type SystemConfiguration } from "@/lib/system-config/schema";

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
