import { z } from "zod";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const interviewQuestionSchema = z.object({
  key: z.string().min(1).max(200),
  domain: z.string().min(1).max(100),
  prompt: z.string().min(1).max(1000),
  kind: z.enum([
    "text",
    "textarea",
    "single_select",
    "multi_select",
    "number",
    "boolean",
    "date",
    "json",
  ]),
  required: z.boolean().default(false),
  dependsOn: z.array(z.string()).default([]),
  options: z.array(
    z.object({
      value: z.string().min(1).max(200),
      label: z.string().min(1).max(200),
    })
  ).default([]),
  metadata: jsonObjectSchema.default({}),
}).strict();

export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const interviewDomainSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  priority: z.number().int().min(0).max(1000).default(0),
  required: z.boolean().default(false),
  description: z.string().min(1).max(500),
  relevanceRules: z.array(
    z.object({
      field: z.string().min(1).max(200),
      operator: z.enum(["exists", "equals", "contains", "not_empty"]),
      value: z.union([z.string(), z.array(z.string())]).optional(),
    })
  ).default([]),
}).strict();

export type InterviewDomain = z.infer<typeof interviewDomainSchema>;

export const answerInputSchema = z.object({
  questionKey: z.string().min(1).max(200),
  answer: jsonValueSchema,
  metadata: jsonObjectSchema.default({}),
}).strict();

export type AnswerInput = z.infer<typeof answerInputSchema>;

export const interviewAnswerSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  onboardingSessionId: z.string().uuid(),
  questionKey: z.string().min(1).max(200),
  answerJson: jsonObjectSchema,
  normalizedFacts: jsonObjectSchema,
  answerStatus: z.enum(["answered", "updated", "superseded", "rejected"]),
  isLatest: z.boolean().default(true),
  version: z.number().int().min(1).default(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type InterviewAnswer = z.infer<typeof interviewAnswerSchema>;

export const interviewSessionSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  workspaceId: z.string().uuid().nullable().default(null),
  status: z.enum(["in_progress", "awaiting_input", "completed", "abandoned"]),
  version: z.number().int().min(1).default(1),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().default(null),
  lastQuestionKey: z.string().max(200).nullable().default(null),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: jsonObjectSchema.default({}),
}).strict();

export type InterviewSession = z.infer<typeof interviewSessionSchema>;

export function normalizeInterviewTimestamp(value: string): string {
  return new Date(value).toISOString();
}

export const normalizedBusinessFactsSchema = z.object({
  business: z.object({
    name: z.string().max(200).optional(),
    legalName: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    stage: z.string().max(200).optional(),
    locations: z.array(z.string().max(200)).default([]),
    website: z.string().max(500).optional(),
  }).catchall(jsonValueSchema).prefault({}),
  customers: z.object({
    segments: z.array(z.string().max(200)).default([]),
    targetAudience: z.array(z.string().max(200)).default([]),
    buyingTriggers: z.array(z.string().max(200)).default([]),
    customerJourney: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  offerings: z.object({
    products: z.array(z.string().max(200)).default([]),
    services: z.array(z.string().max(200)).default([]),
    pricingModel: z.array(z.string().max(200)).default([]),
    deliveryModel: z.array(z.string().max(200)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  people: z.object({
    roles: z.array(z.string().max(200)).default([]),
    owners: z.array(z.string().max(200)).default([]),
    teams: z.array(z.string().max(200)).default([]),
    responsibilities: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  sales: z.object({
    leadSources: z.array(z.string().max(200)).default([]),
    salesProcess: z.array(z.string().max(500)).default([]),
    channels: z.array(z.string().max(200)).default([]),
    conversionIssues: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  workflows: z.object({
    coreProcesses: z.array(z.string().max(500)).default([]),
    bottlenecks: z.array(z.string().max(500)).default([]),
    handoffs: z.array(z.string().max(500)).default([]),
    approvals: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  scheduling: z.object({
    appointments: z.array(z.string().max(500)).default([]),
    calendars: z.array(z.string().max(200)).default([]),
    constraints: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  payments: z.object({
    methods: z.array(z.string().max(200)).default([]),
    cycles: z.array(z.string().max(200)).default([]),
    painPoints: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  inventoryAssets: z.object({
    trackedItems: z.array(z.string().max(200)).default([]),
    locations: z.array(z.string().max(200)).default([]),
    constraints: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  communication: z.object({
    channels: z.array(z.string().max(200)).default([]),
    frequency: z.array(z.string().max(200)).default([]),
    issues: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  tools: z.object({
    software: z.array(z.string().max(200)).default([]),
    integrationNeeds: z.array(z.string().max(200)).default([]),
    customProcesses: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  problems: z.object({
    topProblems: z.array(z.string().max(500)).default([]),
    impact: z.array(z.string().max(500)).default([]),
    urgency: z.array(z.string().max(200)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  goals: z.object({
    objectives: z.array(z.string().max(500)).default([]),
    successMetrics: z.array(z.string().max(500)).default([]),
    timeframes: z.array(z.string().max(200)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  constraints: z.object({
    compliance: z.array(z.string().max(500)).default([]),
    policies: z.array(z.string().max(500)).default([]),
    resourceLimits: z.array(z.string().max(500)).default([]),
    riskFlags: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  automation: z.object({
    opportunities: z.array(z.string().max(500)).default([]),
    manualSteps: z.array(z.string().max(500)).default([]),
    triggers: z.array(z.string().max(500)).default([]),
  }).catchall(jsonValueSchema).prefault({}),
  metadata: z.object({
    confidence: z.number().min(0).max(1).default(0),
    domainsCovered: z.array(z.string().max(100)).default([]),
    reviewState: z.enum(["draft", "reviewed"]).default("draft"),
  }).catchall(jsonValueSchema).prefault({}),
}).passthrough();

export type NormalizedBusinessFacts = z.infer<typeof normalizedBusinessFactsSchema>;

export const nextQuestionDecisionSchema = z.object({
  domain: z.string().min(1).max(100),
  questionKey: z.string().min(1).max(200),
  reason: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1).default(0),
}).strict();

export type NextQuestionDecision = z.infer<typeof nextQuestionDecisionSchema>;

export const completionThresholdConfigSchema = z.object({
  minDomainsWithEvidence: z.number().int().min(1).default(3),
  minConfidence: z.number().min(0).max(1).default(0.6),
  requiredDomains: z.array(z.string().max(100)).default([]),
  optionalDomains: z.array(z.string().max(100)).default([]),
}).strict();

export type CompletionThresholdConfig = z.infer<typeof completionThresholdConfigSchema>;

export const completionStateSchema = z.object({
  isComplete: z.boolean(),
  thresholdConfig: completionThresholdConfigSchema,
  coveredDomains: z.array(z.string().max(100)).default([]),
  missingDomains: z.array(z.string().max(100)).default([]),
  confidence: z.number().min(0).max(1).default(0),
  reason: z.string().max(500).nullable().default(null),
}).strict();

export type CompletionState = z.infer<typeof completionStateSchema>;

export const completionResultSchema = z.object({
  status: z.enum(["complete", "incomplete", "blocked"]),
  state: completionStateSchema,
  nextQuestionKey: z.string().max(200).nullable().default(null),
  finalFacts: normalizedBusinessFactsSchema.optional(),
  message: z.string().max(500).nullable().default(null),
}).strict();

export type CompletionResult = z.infer<typeof completionResultSchema>;

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
}).strict();

export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;

export const createSessionRequestSchema = z.object({
  workspaceId: z.string().uuid().nullable().default(null),
  metadata: jsonObjectSchema.default({}),
}).strict();

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

export const createSessionResponseSchema = z.object({
  session: interviewSessionSchema,
}).strict();

export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;

export const getSessionResponseSchema = z.object({
  session: interviewSessionSchema,
}).strict();

export type GetSessionResponse = z.infer<typeof getSessionResponseSchema>;

export const listSessionsResponseSchema = z.object({
  sessions: z.array(interviewSessionSchema),
}).strict();

export type ListSessionsResponse = z.infer<typeof listSessionsResponseSchema>;

export const saveAnswerRequestSchema = z.object({
  questionKey: z.string().min(1).max(200),
  answer: jsonValueSchema,
  metadata: jsonObjectSchema.default({}),
}).strict();

export type SaveAnswerRequest = z.infer<typeof saveAnswerRequestSchema>;

export const saveAnswerResponseSchema = z.object({
  answer: interviewAnswerSchema,
}).strict();

export type SaveAnswerResponse = z.infer<typeof saveAnswerResponseSchema>;

export const nextQuestionResponseSchema = z.object({
  question: interviewQuestionSchema.nullable().default(null),
  status: z.enum(["ready", "complete", "blocked"]).default("ready"),
  decision: nextQuestionDecisionSchema.nullable().default(null),
}).strict();

export type NextQuestionResponse = z.infer<typeof nextQuestionResponseSchema>;

export const completeSessionRequestSchema = z.object({
  finalFacts: normalizedBusinessFactsSchema.optional(),
  notes: z.string().max(2000).optional(),
}).strict();

export type CompleteSessionRequest = z.infer<typeof completeSessionRequestSchema>;

export const completeSessionResponseSchema = z.object({
  session: interviewSessionSchema,
  completion: completionResultSchema,
}).strict();

export type CompleteSessionResponse = z.infer<typeof completeSessionResponseSchema>;
