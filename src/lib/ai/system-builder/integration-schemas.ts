import { z } from "zod";

const safeText = z.string().min(1).max(500);

export const integrationProviderInputSchemas = {
  email: z.object({
    fromAddress: z.string().email().optional(),
    replyTo: z.string().email().optional(),
  }).strict(),
  calendar: z.object({
    calendarName: safeText.optional(),
  }).strict(),
  analytics: z.object({
    datasetKey: z.string().regex(/^[a-z][a-z0-9_]*$/).optional(),
  }).strict(),
} as const;

export type IntegrationProvider = keyof typeof integrationProviderInputSchemas;

const forbiddenKey = /(api[_-]?key|password|secret|token|private[_-]?key|credential|authorization|cookie|session)/i;
const forbiddenValueKey = /(code|sql|script|function|command|url|endpoint|tool)/i;

export function findUnsafeIntegrationConfig(value: unknown, path = "config"): string | null {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const unsafe = findUnsafeIntegrationConfig(item, `${path}.${index}`);
      if (unsafe) return unsafe;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKey.test(key)) return `${path}.${key} is secret-like`;
      if (forbiddenValueKey.test(key)) return `${path}.${key} is executable or unrestricted`;
      const unsafe = findUnsafeIntegrationConfig(item, `${path}.${key}`);
      if (unsafe) return unsafe;
    }
  }
  return null;
}