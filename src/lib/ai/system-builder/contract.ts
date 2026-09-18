import { z } from "zod";

export const blueprintIdentifierSchema = z.string().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/);

export const blueprintFieldSchema = z.object({
  key: blueprintIdentifierSchema,
  label: z.string().min(1).max(80),
  type: z.enum(["text", "number", "date", "boolean", "select", "currency", "email", "textarea"]),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  referenceEntity: blueprintIdentifierSchema.optional(),
  options: z.array(z.string().min(1).max(80)).max(30).optional(),
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
}).strict();

export const blueprintWorkflowSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  trigger: z.enum(["record_created", "record_updated", "status_changed", "schedule", "manual", "webhook"]),
  steps: z.array(blueprintWorkflowStepSchema).min(1).max(12),
}).strict();

export const blueprintRoleSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(250),
  permissions: z.array(z.string().min(1).max(80)).min(1).max(20),
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
}).strict();

export const blueprintAgentSchema = z.object({
  name: z.string().min(1).max(120),
  persona: z.string().min(1).max(250),
  mission: z.string().min(1).max(500),
  responsibilities: z.array(z.string().min(1).max(220)).min(1).max(12),
  guardrails: z.array(z.string().min(1).max(220)).min(1).max(12),
  allowedTools: z.array(z.string().min(1).max(120)).min(1).max(12),
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
export type BlueprintView = z.infer<typeof blueprintViewSchema>;
export type BlueprintAutomation = z.infer<typeof blueprintAutomationSchema>;
export type BlueprintIntegration = z.infer<typeof blueprintIntegrationSchema>;
export type BlueprintAgent = z.infer<typeof blueprintAgentSchema>;
export type SystemBlueprint = z.infer<typeof systemBlueprintSchema>;
