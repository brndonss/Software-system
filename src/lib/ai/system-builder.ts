export { buildSystem, blueprintSchemaFromFacts, buildFallbackSystemBlueprint, generateSystemBlueprint } from "@/lib/ai/system-builder/builder";
export { validateSystemBlueprint, assertValidSystemBlueprint } from "@/lib/ai/system-builder/validator";
export { systemBlueprintSchema, type SystemBlueprint, type BlueprintField, type BlueprintEntity, type BlueprintRelationship, type BlueprintWorkflowStep, type BlueprintWorkflow, type BlueprintRole, type BlueprintView, type BlueprintAutomation, type BlueprintIntegration, type BlueprintAgent } from "@/lib/ai/system-builder/contract";
export { capabilityRegistry, isSupportedCapability } from "@/lib/ai/system-builder/capabilities";

