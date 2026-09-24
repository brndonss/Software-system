import { z } from "zod";

export const blueprintTransitionRequestSchema = z.object({
  expectedVersion: z.number().int().positive(),
}).strict();

export const rejectBlueprintRequestSchema = blueprintTransitionRequestSchema.extend({
  reviewNotes: z.string().trim().min(1).max(2000),
}).strict();

export type BlueprintLifecycleStatus = "draft" | "in_review" | "approved" | "rejected" | "archived";

export const allowedBlueprintTransitions: Record<BlueprintLifecycleStatus, BlueprintLifecycleStatus[]> = {
  draft: ["in_review"],
  in_review: ["approved", "rejected"],
  approved: [],
  rejected: ["in_review"],
  archived: [],
};

export function canTransitionBlueprint(
  currentStatus: BlueprintLifecycleStatus,
  nextStatus: BlueprintLifecycleStatus,
): boolean {
  return allowedBlueprintTransitions[currentStatus].includes(nextStatus);
}
