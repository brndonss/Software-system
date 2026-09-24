import { systemBlueprintSchema, type SystemBlueprint } from "./contract";
import { capabilityRegistry, getUnsupportedCapabilityMessage, isSupportedCapability } from "./capabilities";
import { workflowActionInputSchemas } from "./action-schemas";
import { findUnsafeIntegrationConfig, integrationProviderInputSchemas } from "./integration-schemas";

export type BlueprintValidationResult = {
  ok: boolean;
  data?: SystemBlueprint;
  errors: string[];
};

export function validateSystemBlueprint(input: unknown): BlueprintValidationResult {
  const parsed = systemBlueprintSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message) };
  }

  const blueprint = parsed.data;
  const errors: string[] = [];
  const entityKeys = new Set<string>();

  blueprint.entities.forEach((entity, index) => {
    if (entityKeys.has(entity.key)) {
      errors.push(`Duplicate entity key: ${entity.key}`);
    }
    entityKeys.add(entity.key);

    const seenFields = new Set<string>();
    entity.fields.forEach((field) => {
      if (seenFields.has(field.key)) {
        errors.push(`Duplicate field ${field.key} on entity ${entity.key}`);
      }
      seenFields.add(field.key);

      const validation = field.validation;
      if (validation.minLength !== undefined && validation.maxLength !== undefined && validation.minLength > validation.maxLength) {
        errors.push(`Field ${field.key} on entity ${entity.key} has an invalid length range.`);
      }
      if (validation.min !== undefined && validation.max !== undefined && validation.min > validation.max) {
        errors.push(`Field ${field.key} on entity ${entity.key} has an invalid numeric range.`);
      }
      if (validation.pattern) {
        try { new RegExp(validation.pattern); } catch { errors.push(`Field ${field.key} on entity ${entity.key} has an invalid validation pattern.`); }
      }
      if (field.options) {
        if (new Set(field.options).size !== field.options.length) errors.push(`Field ${field.key} on entity ${entity.key} has duplicate allowed values.`);
        if (field.type !== "select") errors.push(`Field ${field.key} on entity ${entity.key} can only define allowed values for select fields.`);
      }
      if (field.type === "select" && (!field.options || field.options.length === 0)) errors.push(`Select field ${field.key} on entity ${entity.key} must define allowed values.`);
      if (field.referenceEntity && !field.relationshipType) errors.push(`Field ${field.key} on entity ${entity.key} must define relationshipType with referenceEntity.`);
      if (field.relationshipType && !field.referenceEntity) errors.push(`Field ${field.key} on entity ${entity.key} must define referenceEntity with relationshipType.`);
      if (field.defaultValue === null && !field.nullable) errors.push(`Field ${field.key} on entity ${entity.key} cannot default to null when nullable is false.`);
      if (!isValidFieldDefault(field)) errors.push(`Field ${field.key} on entity ${entity.key} has an invalid default value.`);

      if (field.referenceEntity && !entityKeys.has(field.referenceEntity)) {
        const entityExists = blueprint.entities.some((candidate) => candidate.key === field.referenceEntity);
        if (!entityExists) {
          errors.push(`Field ${field.key} on entity ${entity.key} references missing entity ${field.referenceEntity}`);
        }
      }
    });

    if (index === 0 && blueprint.entities.length > 40) {
      errors.push("Too many entities for a supported blueprint.");
    }
  });

  blueprint.relationships.forEach((relationship) => {
    if (!entityKeys.has(relationship.fromEntity)) {
      errors.push(`Relationship fromEntity ${relationship.fromEntity} does not exist.`);
    }
    if (!entityKeys.has(relationship.toEntity)) {
      errors.push(`Relationship toEntity ${relationship.toEntity} does not exist.`);
    }
    if (!isSupportedCapability("relationships", relationship.relationshipType)) {
      errors.push(getUnsupportedCapabilityMessage("relationships", relationship.relationshipType));
    }
  });

  blueprint.workflows.forEach((workflow) => {
    if (!isSupportedCapability("workflowTriggers", workflow.trigger)) {
      errors.push(getUnsupportedCapabilityMessage("workflowTriggers", workflow.trigger));
    }

    workflow.steps.forEach((step) => {
      if (!isSupportedCapability("workflowActions", step.type)) {
        errors.push(getUnsupportedCapabilityMessage("workflowActions", step.type));
      }
      if (step.entity && !entityKeys.has(step.entity)) {
        errors.push(`Workflow ${workflow.key} references missing entity ${step.entity}`);
      }
      const actionSchema = workflowActionInputSchemas[step.type as keyof typeof workflowActionInputSchemas];
      const actionResult = actionSchema.safeParse(step.config);
      if (!actionResult.success) {
        errors.push(...actionResult.error.issues.map((issue) => `Workflow ${workflow.key} step ${step.key} config.${issue.path.join(".")}: ${issue.message}`));
      } else {
        const config = actionResult.data as { entity?: string; field?: string; assigneeField?: string };
        if (step.entity && config.entity && step.entity !== config.entity) {
          errors.push(`Workflow ${workflow.key} step ${step.key} has conflicting entity references.`);
        }
        if (config.entity && !entityKeys.has(config.entity)) errors.push(`Workflow ${workflow.key} step ${step.key} config references missing entity ${config.entity}`);
        if (config.entity && config.field && !blueprint.entities.find((entity) => entity.key === config.entity)?.fields.some((field) => field.key === config.field)) {
          errors.push(`Workflow ${workflow.key} step ${step.key} config references missing field ${config.entity}.${config.field}`);
        }
        if (config.entity && config.assigneeField && !blueprint.entities.find((entity) => entity.key === config.entity)?.fields.some((field) => field.key === config.assigneeField)) {
          errors.push(`Workflow ${workflow.key} step ${step.key} config references missing field ${config.entity}.${config.assigneeField}`);
        }
      }
    });
  });

  blueprint.roles.forEach((role) => {
    const permissionKeys = new Set<string>();
    role.permissions.forEach((permission) => {
      const permissionKey = `${permission.action}:${permission.entity}:${permission.field ?? ""}`;
      if (permissionKeys.has(permissionKey)) {
        errors.push(`Role ${role.key} has duplicate permission ${permissionKey}`);
      }
      permissionKeys.add(permissionKey);

      if (!entityKeys.has(permission.entity)) {
        errors.push(`Role ${role.key} permission references missing entity ${permission.entity}`);
      } else if (permission.field) {
        const targetEntity = blueprint.entities.find((entity) => entity.key === permission.entity);
        if (!targetEntity?.fields.some((field) => field.key === permission.field)) {
          errors.push(`Role ${role.key} permission references missing field ${permission.entity}.${permission.field}`);
        }
      }
    });
  });

  blueprint.views.forEach((view) => {
    if (!entityKeys.has(view.entity)) {
      errors.push(`View ${view.key} references missing entity ${view.entity}`);
    }
    if (!isSupportedCapability("viewTypes", view.type)) {
      errors.push(getUnsupportedCapabilityMessage("viewTypes", view.type));
    }
  });

  const reportKeys = new Set<string>();
  blueprint.reports.forEach((report) => {
    if (reportKeys.has(report.key)) errors.push(`Duplicate report key: ${report.key}`);
    reportKeys.add(report.key);
    const fieldFor = (entityKey: string, fieldKey: string, path: string) => {
      const entity = blueprint.entities.find((candidate) => candidate.key === entityKey);
      if (!entity) { errors.push(`Report ${report.key} ${path} references missing entity ${entityKey}`); return undefined; }
      const field = entity.fields.find((candidate) => candidate.key === fieldKey);
      if (!field) errors.push(`Report ${report.key} ${path} references missing field ${entityKey}.${fieldKey}`);
      return field;
    };
    if (!blueprint.entities.some((entity) => entity.key === report.sourceEntity)) errors.push(`Report ${report.key} references missing source entity ${report.sourceEntity}`);
    report.selectedFields.forEach((field, index) => fieldFor(field.entity, field.field, `selectedFields.${index}`));
    report.grouping.forEach((field, index) => fieldFor(field.entity, field.field, `grouping.${index}`));
    report.sorting.forEach((sort, index) => fieldFor(sort.entity, sort.field, `sorting.${index}`));
    report.filters.forEach((filter, index) => {
      const field = fieldFor(filter.entity, filter.field, `filters.${index}`);
      const requiresValue = ["equals", "not_equals", "contains", "starts_with", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "in"].includes(filter.operator);
      if (requiresValue && filter.value === undefined) errors.push(`Report ${report.key} filter ${index} requires a value`);
      if (["is_empty", "is_not_empty"].includes(filter.operator) && filter.value !== undefined) errors.push(`Report ${report.key} filter ${index} must not define a value`);
      if (filter.operator === "in" && filter.value !== undefined && (!Array.isArray(filter.value) || filter.value.length === 0)) errors.push(`Report ${report.key} filter ${index} in operator requires a non-empty array`);
      if (field && ["greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal"].includes(filter.operator) && !["number", "currency", "date"].includes(field.type)) errors.push(`Report ${report.key} filter ${index} uses an incompatible comparison operator`);
    });
    report.measures.forEach((measure, index) => {
      if (measure.aggregation === "count" && !measure.field) return;
      if (!measure.field) { errors.push(`Report ${report.key} measure ${index} requires a field`); return; }
      const field = fieldFor(measure.entity, measure.field, `measures.${index}`);
      if (field && ["sum", "average"].includes(measure.aggregation) && !["number", "currency"].includes(field.type)) errors.push(`Report ${report.key} measure ${index} requires a numeric field`);
      if (field && ["min", "max"].includes(measure.aggregation) && !["number", "currency", "date"].includes(field.type)) errors.push(`Report ${report.key} measure ${index} requires a numeric or date field`);
    });
  });

  blueprint.automations.forEach((automation) => {
    if (!isSupportedCapability("workflowTriggers", automation.trigger)) {
      errors.push(getUnsupportedCapabilityMessage("workflowTriggers", automation.trigger));
    }
    automation.actions.forEach((action) => {
      if (!isSupportedCapability("workflowActions", action)) {
        errors.push(getUnsupportedCapabilityMessage("workflowActions", action));
      }
    });
  });

  blueprint.integrations.forEach((integration) => {
    if (integration.provider.trim().length < 2) {
      errors.push(`Integration ${integration.key} has an invalid provider label.`);
    }
    if (!integration.capability.trim()) {
      errors.push(`Integration ${integration.key} must define a capability.`);
    }
    if (!isSupportedCapability("integrationProviders", integration.provider)) errors.push(getUnsupportedCapabilityMessage("integrationProviders", integration.provider));
    if (!isSupportedCapability("integrationCapabilities", integration.capability)) errors.push(getUnsupportedCapabilityMessage("integrationCapabilities", integration.capability));
    const providerSchema = integrationProviderInputSchemas[integration.provider as keyof typeof integrationProviderInputSchemas];
    if (providerSchema) {
      const configResult = providerSchema.safeParse(integration.config);
      if (!configResult.success) errors.push(...configResult.error.issues.map((issue) => `Integration ${integration.key} config.${issue.path.join(".")}: ${issue.message}`));
    }
    const unsafeConfig = findUnsafeIntegrationConfig(integration.config);
    if (unsafeConfig) errors.push(`Integration ${integration.key} ${unsafeConfig}`);
    integration.references.forEach((reference) => {
      const entity = blueprint.entities.find((candidate) => candidate.key === reference.entity);
      if (!entity) errors.push(`Integration ${integration.key} references missing entity ${reference.entity}`);
      else if (reference.field && !entity.fields.some((field) => field.key === reference.field)) errors.push(`Integration ${integration.key} references missing field ${reference.entity}.${reference.field}`);
    });
  });

  blueprint.agent.allowedTools.forEach((tool) => {
    if (!isSupportedCapability("agentTools", tool)) {
      errors.push(getUnsupportedCapabilityMessage("agentTools", tool));
    }
  });
  const agent = blueprint.agent;
  const agentEntities = new Set(agent.allowedEntities);
  agent.allowedEntities.forEach((entity) => {
    if (!entityKeys.has(entity)) errors.push(`Agent references missing entity ${entity}`);
  });
  const rolePermissionKeys = new Set(blueprint.roles.flatMap((role) => role.permissions.map((permission) => `${permission.action}:${permission.entity}:${permission.field ?? ""}`)));
  agent.allowedActions.forEach((action) => {
    const actionKey = `${action.action}:${action.entity}:${action.field ?? ""}`;
    if (!rolePermissionKeys.has(actionKey)) errors.push(`Agent action ${actionKey} is not authorized by a blueprint role permission`);
    if (!entityKeys.has(action.entity)) errors.push(`Agent action references missing entity ${action.entity}`);
    const entity = blueprint.entities.find((candidate) => candidate.key === action.entity);
    if (action.field && !entity?.fields.some((field) => field.key === action.field)) errors.push(`Agent action references missing field ${action.entity}.${action.field}`);
    if (agent.allowedEntities.length > 0 && !agentEntities.has(action.entity)) errors.push(`Agent action entity ${action.entity} is not in allowedEntities`);
  });
  agent.integrations.forEach((integration) => {
    if (!blueprint.integrations.some((candidate) => candidate.key === integration)) errors.push(`Agent references missing integration ${integration}`);
  });
  const unsafeAgentConfig = findUnsafeIntegrationConfig(agent.modelConfig, "modelConfig");
  if (unsafeAgentConfig) errors.push(`Agent ${unsafeAgentConfig}`);

  if (blueprint.entities.length > 25) {
    errors.push("Blueprint exceeds the supported complexity limit of 25 entities.");
  }
  if (blueprint.workflows.length > 20) {
    errors.push("Blueprint exceeds the supported complexity limit of 20 workflows.");
  }
  if (blueprint.views.length > 15) {
    errors.push("Blueprint exceeds the supported complexity limit of 15 views.");
  }

  if (!blueprint.business.summary || !blueprint.business.vertical || !blueprint.business.operationalFocus) {
    errors.push("Business summary, vertical, and operational focus are required.");
  }

  return errors.length ? { ok: false, errors } : { ok: true, data: blueprint, errors: [] };
}

function isValidFieldDefault(field: SystemBlueprint["entities"][number]["fields"][number]): boolean {
  const value = field.defaultValue;
  if (value === undefined || value === null) return value === undefined || field.nullable;
  if (field.type === "text" || field.type === "textarea" || field.type === "email") return typeof value === "string";
  if (field.type === "number" || field.type === "currency") return typeof value === "number" && Number.isFinite(value);
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "date") return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (field.type === "select") return typeof value === "string" && Boolean(field.options?.includes(value));
  return false;
}

export function assertValidSystemBlueprint(input: unknown): SystemBlueprint {
  const result = validateSystemBlueprint(input);
  if (!result.ok || !result.data) {
    throw new Error(result.errors.join("; "));
  }
  return result.data;
}
