import { z } from "zod";
import { blueprintIdentifierSchema, systemBlueprintSchema } from "@/lib/ai/system-builder/contract";
import { compatibilityMetadataSchema } from "./compatibility";

export const approvedBlueprintInputSchema = z.object({
  workspaceId: z.string().uuid(),
  blueprintId: z.string().uuid(),
  blueprintVersion: z.number().int().positive(),
  blueprintStatus: z.literal("approved"),
  validationStatus: z.literal("valid"),
  blueprint: systemBlueprintSchema,
}).strict();

export type ApprovedBlueprintInput = z.infer<typeof approvedBlueprintInputSchema>;

export const compilerSourceSchema = z.object({
  workspaceId: z.string().uuid(),
  blueprintId: z.string().uuid(),
  blueprintVersion: z.number().int().positive(),
  blueprintHash: z.string().regex(/^sha256-[a-f0-9]{64}$/),
}).strict();

export type CompilerSource = z.infer<typeof compilerSourceSchema>;

const compiledFieldSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  label: z.string().min(1),
  type: z.enum(["text", "number", "date", "boolean", "select", "currency", "email", "textarea"]),
  required: z.boolean(),
  unique: z.boolean(),
  nullable: z.boolean(),
  defaultValue: z.unknown().optional(),
  referenceEntity: blueprintIdentifierSchema.optional(),
  relationshipType: z.enum(["one-to-one", "many-to-one", "many-to-many"]).optional(),
  options: z.array(z.string().min(1)).optional(),
  validation: z.object({
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    pattern: z.string().min(1).max(200).optional(),
  }).strict(),
}).strict();

const compiledEntitySchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  fields: z.array(compiledFieldSchema),
}).strict();

const compiledRelationshipSchema = z.object({
  id: z.string().min(1),
  fromEntity: blueprintIdentifierSchema,
  toEntity: blueprintIdentifierSchema,
  relationshipType: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
  label: z.string().min(1),
}).strict();

const compiledWorkflowStepSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  type: z.enum(["create_record", "update_record", "assign", "create_task", "notify", "wait", "condition"]),
  description: z.string().min(1),
  entity: blueprintIdentifierSchema.optional(),
  targetState: z.string().optional(),
  config: z.record(z.string(), z.unknown()),
}).strict();

const compiledWorkflowSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  trigger: z.enum(["record_created", "record_updated", "status_changed", "schedule", "manual", "webhook"]),
  triggerConfig: z.record(z.string(), z.unknown()),
  steps: z.array(compiledWorkflowStepSchema),
}).strict();

const compiledRoleSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  permissions: z.array(z.object({
    action: z.enum(["create", "read", "update", "archive", "assign", "notify", "approve", "review"]),
    entity: blueprintIdentifierSchema,
    field: blueprintIdentifierSchema.optional(),
  }).strict()),
}).strict();

const compiledViewSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  name: z.string().min(1),
  entity: blueprintIdentifierSchema,
  type: z.enum(["table", "kanban", "calendar", "board", "dashboard", "detail"]),
}).strict();

const compiledAutomationSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  trigger: z.enum(["record_created", "record_updated", "status_changed", "schedule", "manual", "webhook"]),
  actions: z.array(z.string().min(1)),
  conditions: z.array(z.string()),
}).strict();

const compiledIntegrationSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  provider: z.string().min(1),
  capability: z.string().min(1),
  purpose: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  secretRef: z.string().optional(),
  enabled: z.boolean(),
  references: z.array(z.object({ entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema.optional() }).strict()),
}).strict();

const compiledReportSchema = z.object({
  id: z.string().min(1),
  key: blueprintIdentifierSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  sourceEntity: blueprintIdentifierSchema,
  selectedFields: z.array(z.object({ entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema }).strict()),
  filters: z.array(z.object({ entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema, operator: z.string(), value: z.unknown().optional() }).strict()),
  grouping: z.array(z.object({ entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema }).strict()),
  sorting: z.array(z.object({ entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema, direction: z.enum(["asc", "desc"]) }).strict()),
  measures: z.array(z.object({ key: blueprintIdentifierSchema, entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema.optional(), aggregation: z.enum(["count", "sum", "average", "min", "max"]), label: z.string().min(1) }).strict()),
  visualization: z.enum(["table", "number", "bar", "line"]),
}).strict();

const compiledAgentSchema = z.object({
  key: blueprintIdentifierSchema,
  name: z.string().min(1),
  persona: z.string().min(1),
  mission: z.string().min(1),
  responsibilities: z.array(z.string().min(1)),
  guardrails: z.array(z.string().min(1)),
  allowedTools: z.array(z.string().min(1)),
  allowedEntities: z.array(blueprintIdentifierSchema),
  allowedActions: z.array(z.object({ action: z.string(), entity: blueprintIdentifierSchema, field: blueprintIdentifierSchema.optional() }).strict()),
  integrations: z.array(blueprintIdentifierSchema),
  modelConfig: z.record(z.string(), z.unknown()),
  escalationRules: z.array(z.string().min(1)),
}).strict();

export const canonicalCompiledWorkspaceSchema = z.object({
  schemaVersion: z.literal(1),
  compilerVersion: z.literal(1),
  compatibility: compatibilityMetadataSchema,
  workspace: z.object({ id: z.string().uuid() }).strict(),
  business: z.object({
    summary: z.string().min(1),
    vertical: z.string().min(1),
    operationalFocus: z.string().min(1),
  }).strict(),
  entities: z.array(compiledEntitySchema),
  relationships: z.array(compiledRelationshipSchema),
  roles: z.array(compiledRoleSchema),
  workflows: z.array(compiledWorkflowSchema),
  views: z.array(compiledViewSchema),
  automations: z.array(compiledAutomationSchema),
  integrations: z.array(compiledIntegrationSchema),
  reports: z.array(compiledReportSchema),
  agent: compiledAgentSchema,
  assumptions: z.array(z.string()),
  clarificationNeeded: z.array(z.string()),
}).strict();

export type CanonicalCompiledWorkspace = z.infer<typeof canonicalCompiledWorkspaceSchema>;

export const provisioningOperationSchema = z.object({
  operationId: z.string().min(1),
  kind: z.enum([
    "register_entity",
    "register_field",
    "register_relationship",
    "register_role",
    "register_permission",
    "register_workflow",
    "register_workflow_step",
    "register_view",
    "register_automation",
    "register_integration",
    "register_report",
    "register_agent",
  ]),
  targetKey: z.string().min(1),
  dependsOn: z.array(z.string()),
  payload: z.record(z.string(), z.unknown()),
}).strict();

export type ProvisioningOperation = z.infer<typeof provisioningOperationSchema>;

export const provisioningPlanSchema = z.object({
  schemaVersion: z.literal(1),
  compilerVersion: z.literal(1),
  compatibility: compatibilityMetadataSchema,
  workspaceId: z.string().uuid(),
  blueprintId: z.string().uuid(),
  blueprintVersion: z.number().int().positive(),
  operations: z.array(provisioningOperationSchema),
}).strict();

export type ProvisioningPlan = z.infer<typeof provisioningPlanSchema>;

export const compileResultSchema = z.object({
  compilerVersion: z.literal(1),
  blueprintSchemaVersion: z.literal(1),
  compatibility: compatibilityMetadataSchema,
  source: compilerSourceSchema,
  compiledWorkspace: canonicalCompiledWorkspaceSchema,
  provisioningPlan: provisioningPlanSchema,
  compiledWorkspaceHash: z.string().regex(/^sha256-[a-f0-9]{64}$/),
  provisioningPlanHash: z.string().regex(/^sha256-[a-f0-9]{64}$/),
  idempotencyKey: z.string().min(1),
}).strict();

export type CompileResult = z.infer<typeof compileResultSchema>;
