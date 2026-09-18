import { systemBlueprintSchema, type SystemBlueprint } from "./contract";
import { capabilityRegistry, getUnsupportedCapabilityMessage, isSupportedCapability } from "./capabilities";

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
    });
  });

  blueprint.roles.forEach((role) => {
    role.permissions.forEach((permission) => {
      const isRecordPermission = ["create", "read", "update", "archive"].includes(permission);
      const isWorkflowPermission = ["assign", "notify", "approve", "review"].includes(permission);
      if (!isRecordPermission && !isWorkflowPermission) {
        errors.push(`Role ${role.key} has unsupported permission ${permission}`);
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
  });

  blueprint.agent.allowedTools.forEach((tool) => {
    if (!isSupportedCapability("agentTools", tool)) {
      errors.push(getUnsupportedCapabilityMessage("agentTools", tool));
    }
  });

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

export function assertValidSystemBlueprint(input: unknown): SystemBlueprint {
  const result = validateSystemBlueprint(input);
  if (!result.ok || !result.data) {
    throw new Error(result.errors.join("; "));
  }
  return result.data;
}
