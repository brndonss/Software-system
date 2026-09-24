import { z } from "zod";
import { jsonObjectSchema, jsonValueSchema } from "@/lib/ai/interview-contracts";

export const blueprintIdentifierSchema = z.string().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/);

export const blueprintFieldValidationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  pattern: z.string().min(1).max(200).optional(),
}).strict();

export const blueprintRelationshipTypeSchema = z.enum(["one-to-one", "one-to-many", "many-to-many"]);
export const blueprintFieldRelationshipTypeSchema = z.enum(["one-to-one", "many-to-one", "many-to-many"]);

export const blueprintFieldSchema = z.object({
  key: blueprintIdentifierSchema,
  label: z.string().min(1).max(80),
  type: z.enum(["text", "number", "date", "boolean", "select", "currency", "email", "textarea"]),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  nullable: z.boolean().default(true),
  defaultValue: jsonValueSchema.optional(),
  referenceEntity: blueprintIdentifierSchema.optional(),
  relationshipType: blueprintFieldRelationshipTypeSchema.optional(),
  options: z.array(z.string().min(1).max(80)).max(30).optional(),
  validation: blueprintFieldValidationSchema.default({}),
}).strict();

export const blueprintEntitySchema = z.object({
  key: blueprintIdentifierSchema,
  label: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  fields: z.array(blueprintFieldSchema).min(1).max(50),
}).strict();

export const blueprintRelationshipSchema = z.object({
  fromEntity: blueprintIdentifierSchema,
  toEntity: blueprintIdentifierSchema,
  relationshipType: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
  label: z.string().min(1).max(120),
}).strict();

export const blueprintWorkflowStepSchema = z.object({
  key: blueprintIdentifierSchema,
  type: z.enum(["create_record", "update_record", "assign", "create_task", "notify", "wait", "condition"]),
  description: z.string().min(1).max(250),
  entity: blueprintIdentifierSchema.optional(),
  targetState: z.string().max(80).optional(),
  config: jsonObjectSchema.default({}),
}).strict();

export const blueprintWorkflowSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  trigger: z.enum(["record_created", "record_updated", "status_changed", "schedule", "manual", "webhook"]),
  triggerConfig: jsonObjectSchema.default({}),
  steps: z.array(blueprintWorkflowStepSchema).min(1).max(12),
}).strict();

export const blueprintPermissionSchema = z.object({
  action: z.enum(["create", "read", "update", "archive", "assign", "notify", "approve", "review"]),
  entity: blueprintIdentifierSchema,
  field: blueprintIdentifierSchema.optional(),
}).strict();

export const blueprintRoleSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(250),
  permissions: z.array(blueprintPermissionSchema).min(1).max(20),
}).strict();

export const blueprintViewSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1).max(80),
  entity: blueprintIdentifierSchema,
  type: z.enum(["table", "kanban", "calendar", "board", "dashboard", "detail"]),
}).strict();

export const blueprintAutomationSchema = z.object({
  key: blueprintIdentifierSchema,
  trigger: z.enum(["record_created", "record_updated", "status_changed", "schedule", "manual", "webhook"]),
  actions: z.array(z.string().min(1).max(120)).min(1).max(10),
  conditions: z.array(z.string().min(1).max(200)).default([]),
}).strict();

export const blueprintIntegrationSchema = z.object({
  key: blueprintIdentifierSchema,
  provider: z.string().min(1).max(80),
  capability: z.string().min(1).max(120),
  purpose: z.string().min(1).max(250),
  config: jsonObjectSchema.default({}),
  secretRef: z.string().regex(/^[a-z][a-z0-9._/-]{0,199}$/).optional(),
  enabled: z.boolean().default(true),
  references: z.array(z.object({ entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema.optional() }).strict()).max(30).default([]),
}).strict();

export const blueprintReportFilterSchema = z.object({
  entity: blueprintIdentifierSchema,
  field: blueprintIdentifierSchema,
  operator: z.enum(["equals", "not_equals", "contains", "starts_with", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "is_empty", "is_not_empty", "in"]),
  value: jsonValueSchema.optional(),
}).strict();

export const blueprintReportFieldSchema = z.object({
  entity: blueprintIdentifierSchema,
  field: blueprintIdentifierSchema,
}).strict();

export const blueprintReportSortSchema = z.object({
  entity: blueprintIdentifierSchema,
  field: blueprintIdentifierSchema,
  direction: z.enum(["asc", "desc"]),
}).strict();

export const blueprintReportMeasureSchema = z.object({
  key: blueprintIdentifierSchema,
  entity: blueprintIdentifierSchema,
  field: blueprintIdentifierSchema.optional(),
  aggregation: z.enum(["count", "sum", "average", "min", "max"]),
  label: z.string().min(1).max(120),
}).strict();

export const blueprintReportSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  sourceEntity: blueprintIdentifierSchema,
  selectedFields: z.array(blueprintReportFieldSchema).min(1).max(50),
  filters: z.array(blueprintReportFilterSchema).max(30).default([]),
  grouping: z.array(blueprintReportFieldSchema).max(10).default([]),
  sorting: z.array(blueprintReportSortSchema).max(10).default([]),
  measures: z.array(blueprintReportMeasureSchema).max(20).default([]),
  visualization: z.enum(["table", "number", "bar", "line"]).default("table"),
}).strict();

export const blueprintAgentSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1).max(120),
  persona: z.string().min(1).max(250),
  mission: z.string().min(1).max(500),
  responsibilities: z.array(z.string().min(1).max(220)).min(1).max(12),
  guardrails: z.array(z.string().min(1).max(220)).min(1).max(12),
  allowedTools: z.array(z.string().min(1).max(120)).min(1).max(12),
  allowedEntities: z.array(blueprintIdentifierSchema).max(40).default([]),
  allowedActions: z.array(blueprintPermissionSchema).max(40).default([]),
  integrations: z.array(blueprintIdentifierSchema).max(20).default([]),
  modelConfig: jsonObjectSchema.default({}),
  escalationRules: z.array(z.string().min(1).max(220)).min(1).max(12),
}).strict();

export const systemBlueprintSchema = z.object({
  schemaVersion: z.literal(1),
  business: z.object({
    summary: z.string().min(1).max(2000),
    vertical: z.string().min(1).max(120),
    operationalFocus: z.string().min(1).max(400),
  }).strict(),
  entities: z.array(blueprintEntitySchema).min(1).max(40),
  relationships: z.array(blueprintRelationshipSchema).max(100).default([]),
  workflows: z.array(blueprintWorkflowSchema).min(1).max(30),
  roles: z.array(blueprintRoleSchema).min(1).max(15),
  views: z.array(blueprintViewSchema).min(1).max(30),
  automations: z.array(blueprintAutomationSchema).max(30).default([]),
  integrations: z.array(blueprintIntegrationSchema).max(20).default([]),
  reports: z.array(blueprintReportSchema).max(30).default([]),
  agent: blueprintAgentSchema,
  assumptions: z.array(z.string().min(1).max(400)).max(20).default([]),
  clarificationNeeded: z.array(z.string().min(1).max(400)).max(20).default([]),
}).strict();

export type BlueprintField = z.infer<typeof blueprintFieldSchema>;
export type BlueprintEntity = z.infer<typeof blueprintEntitySchema>;
export type BlueprintRelationship = z.infer<typeof blueprintRelationshipSchema>;
export type BlueprintWorkflowStep = z.infer<typeof blueprintWorkflowStepSchema>;
export type BlueprintWorkflow = z.infer<typeof blueprintWorkflowSchema>;
export type BlueprintRole = z.infer<typeof blueprintRoleSchema>;
export type BlueprintPermission = z.infer<typeof blueprintPermissionSchema>;
export type BlueprintView = z.infer<typeof blueprintViewSchema>;
export type BlueprintAutomation = z.infer<typeof blueprintAutomationSchema>;
export type BlueprintIntegration = z.infer<typeof blueprintIntegrationSchema>;
export type BlueprintReport = z.infer<typeof blueprintReportSchema>;
export type BlueprintAgent = z.infer<typeof blueprintAgentSchema>;
export type SystemBlueprint = z.infer<typeof systemBlueprintSchema>;
