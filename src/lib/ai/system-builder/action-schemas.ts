import { z } from "zod";
import { jsonValueSchema } from "@/lib/ai/interview-contracts";
import { blueprintIdentifierSchema } from "./contract";

const entityReference = z.object({ entity: blueprintIdentifierSchema }).strict();

export const workflowActionInputSchemas = {
  create_record: entityReference,
  update_record: entityReference.extend({ field: blueprintIdentifierSchema, value: jsonValueSchema }),
  assign: entityReference.extend({ assigneeField: blueprintIdentifierSchema.optional() }),
  create_task: entityReference.extend({ title: z.string().min(1).max(200).optional() }),
  notify: z.object({ message: z.string().min(1).max(1000) }).strict(),
  wait: z.object({ durationSeconds: z.number().int().min(0).max(31536000) }).strict(),
  condition: entityReference.extend({
    field: blueprintIdentifierSchema,
    operator: z.enum(["equals", "not_equals", "exists", "not_empty"]),
    value: jsonValueSchema.optional(),
  }).superRefine((value, context) => {
    if (["equals", "not_equals"].includes(value.operator) && value.value === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "A value is required for this condition operator" });
    }
  }),
} as const;

export type WorkflowActionKey = keyof typeof workflowActionInputSchemas;