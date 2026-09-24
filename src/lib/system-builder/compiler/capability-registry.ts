import { z } from "zod";
import { capabilityRegistry as blueprintCapabilities } from "@/lib/ai/system-builder/capabilities";
import { workflowActionInputSchemas } from "@/lib/ai/system-builder/action-schemas";
import { currentCompatibility } from "./compatibility";

export const compilerVersion = currentCompatibility.compilerVersion;
export const capabilityRegistryVersion = currentCompatibility.capabilityRegistryVersion;

export type CompilerCapabilityCategory =
  | "records"
  | "relationships"
  | "workflowTriggers"
  | "workflowActions"
  | "viewTypes"
  | "agentTools"
  | "reportFilterOperators"
  | "reportAggregations"
  | "reportSortDirections"
  | "reportVisualizations";

export type CapabilityDefinition = {
  category: CompilerCapabilityCategory;
  key: string;
  version: 1;
  inputSchema: z.ZodType;
  operationKinds: string[];
};

const emptyCapabilityInputSchema = z.unknown();

function definitions(category: CompilerCapabilityCategory, keys: readonly string[], operationKinds: string[], schemas: Record<string, z.ZodType> = {}): CapabilityDefinition[] {
  return keys.map((key) => ({
    category,
    key,
    version: 1,
    inputSchema: schemas[key] ?? emptyCapabilityInputSchema,
    operationKinds: [...operationKinds],
  }));
}

export const typedCapabilityRegistry: CapabilityDefinition[] = [
  ...definitions("records", blueprintCapabilities.records, ["register_entity", "register_field"]),
  ...definitions("relationships", blueprintCapabilities.relationships, ["register_relationship"]),
  ...definitions("workflowTriggers", blueprintCapabilities.workflowTriggers, ["register_workflow"]),
  ...definitions("workflowActions", blueprintCapabilities.workflowActions, ["register_workflow_step", "register_automation"], workflowActionInputSchemas),
  ...definitions("viewTypes", blueprintCapabilities.viewTypes, ["register_view"]),
  ...definitions("agentTools", blueprintCapabilities.agentTools, ["register_agent"]),
  ...definitions("reportFilterOperators", blueprintCapabilities.reportFilterOperators, ["register_report"]),
  ...definitions("reportAggregations", blueprintCapabilities.reportAggregations, ["register_report"]),
  ...definitions("reportSortDirections", blueprintCapabilities.reportSortDirections, ["register_report"]),
  ...definitions("reportVisualizations", blueprintCapabilities.reportVisualizations, ["register_report"]),
];

export function getCapabilityDefinition(category: CompilerCapabilityCategory, key: string): CapabilityDefinition | undefined {
  return typedCapabilityRegistry.find((definition) => definition.category === category && definition.key === key);
}

export function hasCapability(category: CompilerCapabilityCategory, key: string): boolean {
  return getCapabilityDefinition(category, key) !== undefined;
}
