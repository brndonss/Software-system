export const MODULE_CATALOG = [
  {
    key: "customers",
    name: "Customers",
    description: "Client records, contact details, and lifecycle status.",
    defaultEnabled: true,
    fields: [
      { key: "customer_name", label: "Customer name", type: "text", required: true },
      { key: "phone_number", label: "Phone number", type: "text", required: false },
      { key: "customer_status", label: "Customer status", type: "select", required: false, options: ["Lead", "Active", "Inactive"] },
    ],
    dashboardWidgets: [
      { type: "list", module: "customers", groupBy: "customer_status" },
      { type: "metric", module: "customers", metric: "active_customers" },
    ],
    workflowTemplates: [
      { key: "customer_follow_up", name: "New customer follow-up", trigger: { module: "customers", event: "created" }, actions: [{ type: "create_task", delayMinutes: 60 }] },
    ],
  },
  {
    key: "leads",
    name: "Leads",
    description: "Inbound lead tracking and rapid-response workflows.",
    defaultEnabled: true,
    fields: [
      { key: "lead_name", label: "Lead name", type: "text", required: true },
      { key: "lead_source", label: "Lead source", type: "select", required: false, options: ["Website", "Referral", "Social", "Paid Ads"] },
      { key: "lead_status", label: "Lead status", type: "select", required: false, options: ["New", "Qualified", "Follow-up", "Closed"] },
    ],
    dashboardWidgets: [
      { type: "pipeline", module: "leads", groupBy: "lead_status" },
      { type: "metric", module: "leads", metric: "new_leads" },
    ],
    workflowTemplates: [
      { key: "lead_follow_up", name: "Lead follow-up", trigger: { module: "leads", event: "created" }, actions: [{ type: "send_notification", delayMinutes: 15 }, { type: "create_task", delayMinutes: 30 }] },
    ],
  },
  {
    key: "tasks",
    name: "Tasks",
    description: "Operational work and team assignments.",
    defaultEnabled: true,
    fields: [
      { key: "task_title", label: "Task title", type: "text", required: true },
      { key: "assignee", label: "Assignee", type: "text", required: false },
      { key: "due_date", label: "Due date", type: "date", required: false },
    ],
    dashboardWidgets: [
      { type: "list", module: "tasks", groupBy: "assignee" },
      { type: "metric", module: "tasks", metric: "open_tasks" },
    ],
    workflowTemplates: [
      { key: "task_assignment", name: "Task assignment", trigger: { module: "tasks", event: "created" }, actions: [{ type: "create_task", delayMinutes: 0 }] },
    ],
  },
  {
    key: "appointments",
    name: "Appointments",
    description: "Calendar booking and scheduling management.",
    defaultEnabled: true,
    fields: [
      { key: "appointment_title", label: "Appointment title", type: "text", required: true },
      { key: "appointment_date", label: "Appointment date", type: "date", required: true },
      { key: "appointment_type", label: "Type", type: "select", required: false, options: ["Consultation", "On-site", "Phone", "Video"] },
    ],
    dashboardWidgets: [
      { type: "list", module: "appointments", groupBy: "appointment_date" },
      { type: "metric", module: "appointments", metric: "upcoming_appointments" },
    ],
    workflowTemplates: [
      { key: "appointment_confirmation", name: "Appointment confirmation", trigger: { module: "appointments", event: "created" }, actions: [{ type: "send_notification", delayMinutes: 15 }] },
    ],
  },
  {
    key: "follow_ups",
    name: "Follow-ups",
    description: "Customer and lead follow-up outreach tracking.",
    defaultEnabled: true,
    fields: [
      { key: "follow_up_name", label: "Follow-up name", type: "text", required: true },
      { key: "next_step", label: "Next step", type: "text", required: true },
      { key: "follow_up_status", label: "Status", type: "select", required: false, options: ["Due", "Scheduled", "Completed"] },
    ],
    dashboardWidgets: [
      { type: "list", module: "follow_ups", groupBy: "follow_up_status" },
      { type: "metric", module: "follow_ups", metric: "due_follow_ups" },
    ],
    workflowTemplates: [
      { key: "follow_up_reminder", name: "Follow-up reminder", trigger: { module: "follow_ups", event: "status_changed" }, actions: [{ type: "send_notification", delayMinutes: 0 }] },
    ],
  },
  {
    key: "analytics",
    name: "Analytics",
    description: "Performance tracking and operational reporting.",
    defaultEnabled: true,
    fields: [
      { key: "report_name", label: "Report name", type: "text", required: true },
      { key: "report_period", label: "Period", type: "select", required: false, options: ["Daily", "Weekly", "Monthly", "Quarterly"] },
      { key: "benchmark_target", label: "Benchmark target", type: "number", required: false },
    ],
    dashboardWidgets: [
      { type: "metric", module: "analytics", metric: "conversion_rate" },
      { type: "list", module: "analytics", groupBy: "report_period" },
    ],
    workflowTemplates: [
      { key: "weekly_reporting", name: "Weekly reporting", trigger: { module: "analytics", event: "updated" }, actions: [{ type: "send_notification", delayMinutes: 60 }] },
    ],
  },
] as const;

export const APPROVED_MODULE_KEYS = MODULE_CATALOG.map((module) => module.key);
export const APPROVED_WORKFLOW_TYPES = ["create_task", "send_notification", "update_field"] as const;

export function getCatalogEntry(moduleKey: string) {
  return MODULE_CATALOG.find((module) => module.key === moduleKey);
}
