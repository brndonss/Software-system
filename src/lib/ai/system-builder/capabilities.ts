export const capabilityRegistry = {
  records: ["create", "read", "update", "archive"],
  relationships: ["one-to-one", "one-to-many", "many-to-many"],
  workflowTriggers: ["record_created", "record_updated", "status_changed", "schedule", "manual", "webhook"],
  workflowActions: ["create_record", "update_record", "assign", "create_task", "notify", "wait", "condition"],
  viewTypes: ["table", "kanban", "calendar", "board", "dashboard", "detail"],
  communication: ["email", "notification"],
  scheduling: ["calendar"],
  analytics: ["reports", "dashboards"],
  integrationProviders: ["email", "calendar", "analytics"],
  integrationCapabilities: ["notification", "calendar", "reports", "dashboards"],
  reportFilterOperators: ["equals", "not_equals", "contains", "starts_with", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "is_empty", "is_not_empty", "in"],
  reportAggregations: ["count", "sum", "average", "min", "max"],
  reportSortDirections: ["asc", "desc"],
  reportVisualizations: ["table", "number", "bar", "line"],
  ai: ["retrieval", "tool_calling", "workflow_execution"],
  agentTools: ["read_customer_data", "search_records", "update_record", "create_task", "notify_team", "escalate_exception"],
} as const;

export function isSupportedCapability(category: keyof typeof capabilityRegistry, value: string) {
  return capabilityRegistry[category].includes(value as never);
}

export function getUnsupportedCapabilityMessage(category: keyof typeof capabilityRegistry, value: string) {
  return `Unsupported ${category} capability: "${value}". Allowed values: ${capabilityRegistry[category].join(", ")}.`;
}
