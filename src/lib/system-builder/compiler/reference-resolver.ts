import type { SystemBlueprint } from "@/lib/ai/system-builder/contract";

export type CompilerErrorCode =
  | "invalid_blueprint"
  | "clarification_required"
  | "duplicate_key"
  | "missing_reference"
  | "unsupported_capability"
  | "invalid_field_reference"
  | "invalid_workflow_reference"
  | "invalid_view_reference"
  | "invalid_permission_target"
  | "duplicate_permission";

export type CompilerError = {
  code: CompilerErrorCode;
  path: string;
  message: string;
};

export type BlueprintSymbols = {
  entityKeys: Set<string>;
  fieldKeysByEntity: Map<string, Set<string>>;
};

function duplicateKeys(values: string[], path: string, errors: CompilerError[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) errors.push({ code: "duplicate_key", path, message: `Duplicate key: ${value}` });
    seen.add(value);
  }
}

export function resolveBlueprintReferences(blueprint: SystemBlueprint): { symbols: BlueprintSymbols; errors: CompilerError[] } {
  const errors: CompilerError[] = [];
  const entityKeys = new Set(blueprint.entities.map((entity) => entity.key));
  duplicateKeys(blueprint.entities.map((entity) => entity.key), "entities", errors);

  const fieldKeysByEntity = new Map<string, Set<string>>();
  for (const entity of blueprint.entities) {
    const fieldKeys = new Set(entity.fields.map((field) => field.key));
    duplicateKeys(entity.fields.map((field) => field.key), `entities.${entity.key}.fields`, errors);
    fieldKeysByEntity.set(entity.key, fieldKeys);
    entity.fields.forEach((field, index) => {
      if (field.referenceEntity && !entityKeys.has(field.referenceEntity)) {
        errors.push({
          code: "invalid_field_reference",
          path: `entities.${entity.key}.fields.${index}.referenceEntity`,
          message: `Field ${field.key} references missing entity ${field.referenceEntity}`,
        });
      }
    });
  }

  duplicateKeys(blueprint.relationships.map((relationship) => `${relationship.fromEntity}:${relationship.toEntity}:${relationship.relationshipType}:${relationship.label}`), "relationships", errors);
  blueprint.relationships.forEach((relationship, index) => {
    if (!entityKeys.has(relationship.fromEntity)) errors.push({ code: "missing_reference", path: `relationships.${index}.fromEntity`, message: `Missing entity ${relationship.fromEntity}` });
    if (!entityKeys.has(relationship.toEntity)) errors.push({ code: "missing_reference", path: `relationships.${index}.toEntity`, message: `Missing entity ${relationship.toEntity}` });
  });

  duplicateKeys(blueprint.workflows.map((workflow) => workflow.key), "workflows", errors);
  blueprint.workflows.forEach((workflow, workflowIndex) => {
    duplicateKeys(workflow.steps.map((step) => step.key), `workflows.${workflow.key}.steps`, errors);
    workflow.steps.forEach((step, stepIndex) => {
      if (step.entity && !entityKeys.has(step.entity)) errors.push({ code: "invalid_workflow_reference", path: `workflows.${workflowIndex}.steps.${stepIndex}.entity`, message: `Missing entity ${step.entity}` });
    });
  });

  duplicateKeys(blueprint.roles.map((role) => role.key), "roles", errors);
  blueprint.roles.forEach((role) => {
    const permissionKeys = new Set<string>();
    role.permissions.forEach((permission, index) => {
      const permissionKey = `${permission.action}:${permission.entity}:${permission.field ?? ""}`;
      if (permissionKeys.has(permissionKey)) {
        errors.push({ code: "duplicate_permission", path: `roles.${role.key}.permissions.${index}`, message: `Duplicate permission ${permissionKey}` });
      }
      permissionKeys.add(permissionKey);
      if (!entityKeys.has(permission.entity)) {
        errors.push({ code: "invalid_permission_target", path: `roles.${role.key}.permissions.${index}.entity`, message: `Permission references missing entity ${permission.entity}` });
      } else if (permission.field && !fieldKeysByEntity.get(permission.entity)?.has(permission.field)) {
        errors.push({ code: "invalid_permission_target", path: `roles.${role.key}.permissions.${index}.field`, message: `Permission references missing field ${permission.entity}.${permission.field}` });
      }
    });
  });
  duplicateKeys(blueprint.views.map((view) => view.key), "views", errors);
  blueprint.views.forEach((view, index) => {
    if (!entityKeys.has(view.entity)) errors.push({ code: "invalid_view_reference", path: `views.${index}.entity`, message: `Missing entity ${view.entity}` });
  });
  duplicateKeys(blueprint.automations.map((automation) => automation.key), "automations", errors);
  duplicateKeys(blueprint.integrations.map((integration) => integration.key), "integrations", errors);

  return { symbols: { entityKeys, fieldKeysByEntity }, errors };
}
