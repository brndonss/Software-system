import { validateSystemBlueprint } from "@/lib/ai/system-builder/validator";
import type { SystemBlueprint } from "@/lib/ai/system-builder/contract";
import type { JsonValue } from "@/lib/ai/interview-contracts";
import { normalizeCanonicalString, sortByKey, sortCanonicalValue } from "./canonicalize";
import {
  approvedBlueprintInputSchema,
  canonicalCompiledWorkspaceSchema,
  compileResultSchema,
  provisioningPlanSchema,
  type ApprovedBlueprintInput,
  type CanonicalCompiledWorkspace,
  type CompileResult,
  type ProvisioningOperation,
  type ProvisioningPlan,
} from "./contract";
import { buildIdempotencyKey, sha256 } from "./hash";
import { hasCapability } from "./capability-registry";
import { resolveBlueprintReferences, type CompilerError } from "./reference-resolver";
import { assertSupportedCompatibility, currentCompatibility } from "./compatibility";

export const compilerVersion = currentCompatibility.compilerVersion;

const supportedFieldTypes = new Set(["text", "number", "date", "boolean", "select", "currency", "email", "textarea"]);
const supportedPermissions = new Set(["create", "read", "update", "archive", "assign", "notify", "approve", "review"]);
const supportedIntegrationCapabilities = new Set(["email", "notification", "calendar", "reports", "dashboards", "retrieval", "tool_calling", "workflow_execution"]);

export class BlueprintCompilerError extends Error {
  constructor(public readonly errors: CompilerError[]) {
    super(errors.map((error) => `${error.path}: ${error.message}`).join("; "));
    this.name = "BlueprintCompilerError";
  }
}

function compilerError(code: CompilerError["code"], path: string, message: string): CompilerError {
  return { code, path, message };
}

function canonicalizeBlueprint(blueprint: SystemBlueprint): SystemBlueprint {
  return {
    schemaVersion: blueprint.schemaVersion,
    business: {
      summary: normalizeCanonicalString(blueprint.business.summary),
      vertical: normalizeCanonicalString(blueprint.business.vertical),
      operationalFocus: normalizeCanonicalString(blueprint.business.operationalFocus),
    },
    entities: sortByKey(blueprint.entities).map((entity) => ({
      key: entity.key,
      label: normalizeCanonicalString(entity.label),
      description: normalizeCanonicalString(entity.description),
      fields: sortByKey(entity.fields).map((field) => ({
        key: field.key,
        label: normalizeCanonicalString(field.label),
        type: field.type,
        required: field.required,
        unique: field.unique,
        nullable: field.nullable,
        ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
        ...(field.referenceEntity ? { referenceEntity: field.referenceEntity } : {}),
        ...(field.relationshipType ? { relationshipType: field.relationshipType } : {}),
        ...(field.options ? { options: [...field.options].map(normalizeCanonicalString).sort((left, right) => left.localeCompare(right)) } : {}),
        validation: field.validation,
      })),
    })),
    relationships: [...blueprint.relationships]
      .map((relationship) => ({ ...relationship, label: normalizeCanonicalString(relationship.label) }))
      .sort((left, right) => `${left.fromEntity}:${left.toEntity}:${left.relationshipType}:${left.label}`.localeCompare(`${right.fromEntity}:${right.toEntity}:${right.relationshipType}:${right.label}`)),
    workflows: sortByKey(blueprint.workflows).map((workflow) => ({
      ...workflow,
      name: normalizeCanonicalString(workflow.name),
      description: normalizeCanonicalString(workflow.description),
      steps: workflow.steps.map((step) => ({
        ...step,
        description: normalizeCanonicalString(step.description),
        ...(step.targetState ? { targetState: normalizeCanonicalString(step.targetState) } : {}),
        config: sortCanonicalValue(step.config) as Record<string, JsonValue>,
      })),
      triggerConfig: sortCanonicalValue(workflow.triggerConfig) as Record<string, JsonValue>,
    })),
    roles: sortByKey(blueprint.roles).map((role) => ({
      ...role,
      name: normalizeCanonicalString(role.name),
      description: normalizeCanonicalString(role.description),
      permissions: [...role.permissions].sort((left, right) => `${left.action}:${left.entity}:${left.field ?? ""}`.localeCompare(`${right.action}:${right.entity}:${right.field ?? ""}`)),
    })),
    views: sortByKey(blueprint.views).map((view) => ({ ...view, name: normalizeCanonicalString(view.name) })),
    automations: sortByKey(blueprint.automations).map((automation) => ({
      ...automation,
      actions: [...automation.actions],
      conditions: [...automation.conditions].map(normalizeCanonicalString),
    })),
    integrations: sortByKey(blueprint.integrations).map((integration) => ({
      ...integration,
      provider: normalizeCanonicalString(integration.provider),
      capability: normalizeCanonicalString(integration.capability),
      purpose: normalizeCanonicalString(integration.purpose),
      config: sortCanonicalValue(integration.config) as Record<string, JsonValue>,
      references: [...integration.references].sort((left, right) => `${left.entity}.${left.field ?? ""}`.localeCompare(`${right.entity}.${right.field ?? ""}`)),
    })),
    reports: sortByKey(blueprint.reports).map((report) => ({
      ...report,
      name: normalizeCanonicalString(report.name),
      description: normalizeCanonicalString(report.description),
      filters: [...report.filters].map((filter) => sortCanonicalValue(filter) as typeof filter).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      selectedFields: report.selectedFields.map((field) => ({ ...field })),
      grouping: report.grouping.map((field) => ({ ...field })),
      sorting: report.sorting.map((sort) => ({ ...sort })),
      measures: report.measures.map((measure) => ({ ...measure, label: normalizeCanonicalString(measure.label) })),
    })),
    agent: {
      ...blueprint.agent,
      key: blueprint.agent.key,
      name: normalizeCanonicalString(blueprint.agent.name),
      persona: normalizeCanonicalString(blueprint.agent.persona),
      mission: normalizeCanonicalString(blueprint.agent.mission),
      responsibilities: [...blueprint.agent.responsibilities].map(normalizeCanonicalString),
      guardrails: [...blueprint.agent.guardrails].map(normalizeCanonicalString),
      allowedTools: [...blueprint.agent.allowedTools].sort((left, right) => left.localeCompare(right)),
      allowedEntities: [...blueprint.agent.allowedEntities].sort((left, right) => left.localeCompare(right)),
      allowedActions: [...blueprint.agent.allowedActions].sort((left, right) => `${left.action}:${left.entity}:${left.field ?? ""}`.localeCompare(`${right.action}:${right.entity}:${right.field ?? ""}`)),
      integrations: [...blueprint.agent.integrations].sort((left, right) => left.localeCompare(right)),
      modelConfig: sortCanonicalValue(blueprint.agent.modelConfig) as Record<string, JsonValue>,
      escalationRules: [...blueprint.agent.escalationRules].map(normalizeCanonicalString),
    },
    assumptions: [...blueprint.assumptions].map(normalizeCanonicalString).sort((left, right) => left.localeCompare(right)),
    clarificationNeeded: [...blueprint.clarificationNeeded].map(normalizeCanonicalString).sort((left, right) => left.localeCompare(right)),
  };
}

function validateCompilerCapabilities(blueprint: SystemBlueprint): CompilerError[] {
  const errors: CompilerError[] = [];
  blueprint.entities.forEach((entity) => entity.fields.forEach((field) => {
    if (!supportedFieldTypes.has(field.type)) errors.push(compilerError("unsupported_capability", `entities.${entity.key}.fields.${field.key}.type`, `Unsupported field type ${field.type}`));
  }));
  blueprint.relationships.forEach((relationship, index) => {
    if (!hasCapability("relationships", relationship.relationshipType)) errors.push(compilerError("unsupported_capability", `relationships.${index}.relationshipType`, `Unsupported relationship ${relationship.relationshipType}`));
  });
  blueprint.workflows.forEach((workflow) => {
    if (!hasCapability("workflowTriggers", workflow.trigger)) errors.push(compilerError("unsupported_capability", `workflows.${workflow.key}.trigger`, `Unsupported workflow trigger ${workflow.trigger}`));
    workflow.steps.forEach((step) => {
      if (!hasCapability("workflowActions", step.type)) errors.push(compilerError("unsupported_capability", `workflows.${workflow.key}.steps.${step.key}.type`, `Unsupported workflow action ${step.type}`));
    });
  });
  blueprint.roles.forEach((role) => role.permissions.forEach((permission, index) => {
    if (!supportedPermissions.has(permission.action)) errors.push(compilerError("unsupported_capability", `roles.${role.key}.permissions.${index}.action`, `Unsupported permission ${permission.action}`));
  }));
  blueprint.views.forEach((view) => {
    if (!hasCapability("viewTypes", view.type)) errors.push(compilerError("unsupported_capability", `views.${view.key}.type`, `Unsupported view type ${view.type}`));
  });
  blueprint.automations.forEach((automation) => {
    if (!hasCapability("workflowTriggers", automation.trigger)) errors.push(compilerError("unsupported_capability", `automations.${automation.key}.trigger`, `Unsupported automation trigger ${automation.trigger}`));
    automation.actions.forEach((action) => {
      if (!hasCapability("workflowActions", action)) errors.push(compilerError("unsupported_capability", `automations.${automation.key}.actions`, `Unsupported automation action ${action}`));
    });
  });
  blueprint.integrations.forEach((integration) => {
    if (!supportedIntegrationCapabilities.has(integration.capability)) errors.push(compilerError("unsupported_capability", `integrations.${integration.key}.capability`, `Unsupported integration capability ${integration.capability}`));
  });
  blueprint.agent.allowedTools.forEach((tool) => {
    if (!hasCapability("agentTools", tool)) errors.push(compilerError("unsupported_capability", "agent.allowedTools", `Unsupported agent tool ${tool}`));
  });
  if (blueprint.clarificationNeeded.length > 0) errors.push(compilerError("clarification_required", "clarificationNeeded", "Blueprint still requires clarification"));
  return errors;
}

function id(kind: string, key: string): string {
  return `${kind}:${key}`;
}

function buildCompiledWorkspace(input: ApprovedBlueprintInput, blueprint: SystemBlueprint): CanonicalCompiledWorkspace {
  const entityId = (key: string) => id(`entity:${input.workspaceId}`, key);
  const compiled: CanonicalCompiledWorkspace = {
    schemaVersion: 1,
    compilerVersion,
    compatibility: currentCompatibility,
    workspace: { id: input.workspaceId },
    business: blueprint.business,
    entities: blueprint.entities.map((entity) => ({
      id: entityId(entity.key),
      key: entity.key,
      label: entity.label,
      description: entity.description,
      fields: entity.fields.map((field) => ({ id: id(`field:${input.workspaceId}:${entity.key}`, field.key), ...field })),
    })),
    relationships: blueprint.relationships.map((relationship) => ({ id: id(`relationship:${input.workspaceId}`, `${relationship.fromEntity}:${relationship.toEntity}:${relationship.relationshipType}:${relationship.label}`), ...relationship })),
    roles: blueprint.roles.map((role) => ({ id: id(`role:${input.workspaceId}`, role.key), ...role })),
    workflows: blueprint.workflows.map((workflow) => ({ id: id(`workflow:${input.workspaceId}`, workflow.key), ...workflow, steps: workflow.steps.map((step) => ({ id: id(`workflow-step:${input.workspaceId}:${workflow.key}`, step.key), ...step })) })),
    views: blueprint.views.map((view) => ({ id: id(`view:${input.workspaceId}`, view.key), ...view })),
    automations: blueprint.automations.map((automation) => ({ id: id(`automation:${input.workspaceId}`, automation.key), ...automation })),
    integrations: blueprint.integrations.map((integration) => ({ id: id(`integration:${input.workspaceId}`, integration.key), ...integration })),
    reports: blueprint.reports.map((report) => ({ id: id(`report:${input.workspaceId}`, report.key), ...report })),
    agent: blueprint.agent,
    assumptions: blueprint.assumptions,
    clarificationNeeded: blueprint.clarificationNeeded,
  };
  return canonicalCompiledWorkspaceSchema.parse(compiled);
}

function buildProvisioningPlan(input: ApprovedBlueprintInput, compiled: CanonicalCompiledWorkspace): ProvisioningPlan {
  const operations: ProvisioningOperation[] = [];
  const add = (operation: Omit<ProvisioningOperation, "operationId">) => operations.push({ operationId: `${operation.kind}:${operation.targetKey}`, ...operation });

  for (const entity of compiled.entities) {
    add({ kind: "register_entity", targetKey: entity.key, dependsOn: [], payload: entity });
    for (const field of entity.fields) add({ kind: "register_field", targetKey: `${entity.key}.${field.key}`, dependsOn: [
      `register_entity:${entity.key}`,
      ...(field.referenceEntity && field.referenceEntity !== entity.key ? [`register_entity:${field.referenceEntity}`] : []),
    ], payload: field });
  }
  for (const relationship of compiled.relationships) add({ kind: "register_relationship", targetKey: relationship.id, dependsOn: [`register_entity:${relationship.fromEntity}`, `register_entity:${relationship.toEntity}`], payload: relationship });
  for (const role of compiled.roles) {
    add({ kind: "register_role", targetKey: role.key, dependsOn: [], payload: { ...role, permissions: undefined } });
    for (const permission of role.permissions) {
      const targetKey = `${role.key}.${permission.action}.${permission.entity}.${permission.field ?? "*"}`;
      const dependsOn = [`register_role:${role.key}`, `register_entity:${permission.entity}`];
      if (permission.field) dependsOn.push(`register_field:${permission.entity}.${permission.field}`);
      add({ kind: "register_permission", targetKey, dependsOn, payload: { roleKey: role.key, permission } });
    }
  }
  for (const workflow of compiled.workflows) {
    add({ kind: "register_workflow", targetKey: workflow.key, dependsOn: [], payload: { ...workflow, steps: undefined } });
    for (const step of workflow.steps) add({ kind: "register_workflow_step", targetKey: `${workflow.key}.${step.key}`, dependsOn: [`register_workflow:${workflow.key}`, ...(step.entity ? [`register_entity:${step.entity}`] : [])], payload: step });
  }
  for (const view of compiled.views) add({ kind: "register_view", targetKey: view.key, dependsOn: [`register_entity:${view.entity}`], payload: view });
  for (const automation of compiled.automations) add({ kind: "register_automation", targetKey: automation.key, dependsOn: [], payload: automation });
  for (const integration of compiled.integrations) {
    const dependencies = new Set<string>();
    for (const reference of integration.references) {
      dependencies.add(`register_entity:${reference.entity}`);
      if (reference.field) dependencies.add(`register_field:${reference.entity}.${reference.field}`);
    }
    add({ kind: "register_integration", targetKey: integration.key, dependsOn: [...dependencies].sort(), payload: {
      key: integration.key,
      provider: integration.provider,
      capability: integration.capability,
      config: integration.config,
      secret_ref: integration.secretRef,
      status: integration.enabled ? "unconfigured" : "disabled",
      references: integration.references,
    } });
  }
  for (const report of compiled.reports) {
    const dependencies = new Set<string>([`register_entity:${report.sourceEntity}`]);
    for (const field of [...report.selectedFields, ...report.grouping, ...report.sorting]) dependencies.add(`register_field:${field.entity}.${field.field}`);
    for (const filter of report.filters) dependencies.add(`register_field:${filter.entity}.${filter.field}`);
    for (const measure of report.measures) if (measure.field) dependencies.add(`register_field:${measure.entity}.${measure.field}`);
    add({ kind: "register_report", targetKey: report.key, dependsOn: [...dependencies].sort(), payload: {
      key: report.key,
      name: report.name,
      description: report.description,
      source_definition: { sourceEntity: report.sourceEntity, selectedFields: report.selectedFields, sorting: report.sorting, visualization: report.visualization },
      filters: report.filters,
      grouping: report.grouping,
      measures: report.measures,
      visualization: report.visualization,
    } });
  }
  const agentDependencies = new Set<string>();
  for (const entity of compiled.agent.allowedEntities) agentDependencies.add(`register_entity:${entity}`);
  for (const action of compiled.agent.allowedActions) {
    for (const role of compiled.roles) {
      if (role.permissions.some((permission) => permission.action === action.action && permission.entity === action.entity && permission.field === action.field)) {
        agentDependencies.add(`register_permission:${role.key}.${action.action}.${action.entity}.${action.field ?? "*"}`);
      }
    }
    if (action.field) agentDependencies.add(`register_field:${action.entity}.${action.field}`);
  }
  for (const integration of compiled.agent.integrations) agentDependencies.add(`register_integration:${integration}`);
  add({ kind: "register_agent", targetKey: compiled.agent.key, dependsOn: [...agentDependencies].sort(), payload: compiled.agent });

  return provisioningPlanSchema.parse({
    schemaVersion: 1,
    compilerVersion,
    compatibility: currentCompatibility,
    workspaceId: input.workspaceId,
    blueprintId: input.blueprintId,
    blueprintVersion: input.blueprintVersion,
    operations,
  });
}

export async function compileApprovedBlueprint(rawInput: unknown): Promise<CompileResult> {
  const input = approvedBlueprintInputSchema.parse(rawInput);
  assertSupportedCompatibility({
    ...currentCompatibility,
    blueprintSchemaVersion: input.blueprint.schemaVersion,
  });
  const validated = validateSystemBlueprint(input.blueprint);
  if (!validated.ok || !validated.data) throw new BlueprintCompilerError([compilerError("invalid_blueprint", "blueprint", validated.errors.join("; "))]);

  const blueprint = canonicalizeBlueprint(validated.data);
  const referenceResult = resolveBlueprintReferences(blueprint);
  const capabilityErrors = validateCompilerCapabilities(blueprint);
  const errors = [...referenceResult.errors, ...capabilityErrors];
  if (errors.length) throw new BlueprintCompilerError(errors);

  const blueprintHash = sha256(blueprint);
  const compiledWorkspace = buildCompiledWorkspace(input, blueprint);
  const provisioningPlan = buildProvisioningPlan(input, compiledWorkspace);
  const compiledWorkspaceHash = sha256(compiledWorkspace);
  const provisioningPlanHash = sha256(provisioningPlan);
  const compatibilityHash = sha256(currentCompatibility);

  return compileResultSchema.parse({
    compilerVersion,
    blueprintSchemaVersion: blueprint.schemaVersion,
    compatibility: currentCompatibility,
    source: { workspaceId: input.workspaceId, blueprintId: input.blueprintId, blueprintVersion: input.blueprintVersion, blueprintHash },
    compiledWorkspace,
    provisioningPlan,
    compiledWorkspaceHash,
    provisioningPlanHash,
    idempotencyKey: buildIdempotencyKey({ workspaceId: input.workspaceId, blueprintId: input.blueprintId, blueprintVersion: input.blueprintVersion, compilerVersion, blueprintHash, compatibilityHash }),
  });
}
