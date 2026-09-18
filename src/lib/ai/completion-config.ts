import { z } from "zod";
import { completionThresholdConfigSchema } from "@/lib/ai/interview-contracts";

export const defaultCompletionThresholdConfig = completionThresholdConfigSchema.parse({
  minDomainsWithEvidence: 3,
  minConfidence: 0.6,
  requiredDomains: [],
  optionalDomains: [],
});

export type CompletionThresholdConfig = z.infer<typeof completionThresholdConfigSchema>;

export function getCompletionThresholdConfig(
  overrides?: Partial<CompletionThresholdConfig>
): CompletionThresholdConfig {
  return completionThresholdConfigSchema.parse({
    ...defaultCompletionThresholdConfig,
    ...overrides,
  });
}
