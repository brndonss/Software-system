import { z } from "zod";

export const compatibilityMetadataSchema = z.object({
  compilerVersion: z.number().int().positive(),
  blueprintSchemaVersion: z.number().int().positive(),
  runtimeSchemaVersion: z.number().int().positive(),
  capabilityRegistryVersion: z.string().min(1),
}).strict();

export type CompatibilityMetadata = z.infer<typeof compatibilityMetadataSchema>;

export const currentCompatibility = Object.freeze({
  compilerVersion: 1,
  blueprintSchemaVersion: 1,
  runtimeSchemaVersion: 1,
  capabilityRegistryVersion: "1",
} as const satisfies CompatibilityMetadata);

export function assertSupportedCompatibility(metadata: unknown): CompatibilityMetadata {
  const parsed = compatibilityMetadataSchema.parse(metadata);
  for (const key of ["compilerVersion", "blueprintSchemaVersion", "runtimeSchemaVersion", "capabilityRegistryVersion"] as const) {
    if (parsed[key] !== currentCompatibility[key]) {
      throw new Error(`Unsupported ${key}: ${String(parsed[key])}`);
    }
  }
  return parsed;
}
