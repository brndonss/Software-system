export const ALLOWED_ACTIONS = [
  "create_task",
  "send_notification",
  "update_field",
  "schedule_follow_up",
  "create_lead",
  "record_customer_activity",
  "request_approval",
] as const;

export const ALLOWED_INTEGRATIONS = [
  "email",
  "sms",
  "calendar",
  "crm",
  "analytics",
  "storage",
] as const;

export function buildActionPlan(input: Record<string, unknown>) {
  const onboarding = (input.onboarding ?? {}) as Record<string, unknown>;
  const businessNiche = String(onboarding.business_niche ?? onboarding.businessNiche ?? "local business").trim() || "local business";
  const services = String(onboarding.services_products ?? onboarding.servicesProducts ?? "business services").trim() || "business services";
  const goals = String(onboarding.software_goals ?? onboarding.softwareGoals ?? "operational clarity").trim() || "operational clarity";

  const suggestions = [
    { id: "lead_follow_up", title: "Lead follow-up automation", description: `Create a repeatable lead follow-up process for ${businessNiche}.`, requiredPermission: "email", actionIds: ["create_lead", "create_task", "send_notification"] },
    { id: "customer_reminders", title: "Customer reminders", description: `Keep customers informed about appointments and service milestones for ${services}.`, requiredPermission: "calendar", actionIds: ["schedule_follow_up", "send_notification", "record_customer_activity"] },
    { id: "operational_reporting", title: "Operational reporting", description: `Track the metrics and tasks that matter most for ${goals}.`, requiredPermission: "analytics", actionIds: ["create_task", "update_field", "request_approval"] },
  ];

  return {
    safeActions: [...ALLOWED_ACTIONS],
    integrations: [...ALLOWED_INTEGRATIONS],
    opportunities: suggestions,
  };
}
