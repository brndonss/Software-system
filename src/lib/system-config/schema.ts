import { z } from "zod";

export const moduleFieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(100),
  type: z.enum(["text", "number", "date", "select", "boolean"]),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(100)).max(30).optional(),
}).strict();

export const moduleSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1).max(100),
  enabled: z.boolean(),
  fields: z.array(moduleFieldSchema).max(50),
}).strict();

export const workflowSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1).max(120),
  trigger: z.object({ module: z.string(), event: z.enum(["created", "updated", "status_changed"]) }).strict(),
  actions: z.array(z.object({ type: z.enum(["create_task", "send_notification", "update_field"]), delayMinutes: z.number().int().min(0).max(525600).optional() }).strict()).max(10),
}).strict();

export const systemConfigurationSchema = z.object({
  schemaVersion: z.literal(1),
  businessSummary: z.object({ niche: z.string().min(1).max(200), primaryGoals: z.array(z.string().min(1).max(300)).max(10) }).strict(),
  modules: z.array(moduleSchema).min(1).max(20),
  workflows: z.array(workflowSchema).max(50),
  dashboard: z.object({ widgets: z.array(z.object({ type: z.enum(["metric", "list", "pipeline"]), module: z.string(), metric: z.string().optional(), groupBy: z.string().optional() }).strict()).max(30) }).strict(),
}).strict();

export type SystemConfiguration = z.infer<typeof systemConfigurationSchema>;
