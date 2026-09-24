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

function splitNormalizedString(value: string, maxLength: number): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/(?<=[.!?])\s+|,\s+/)
    .flatMap((segment) => {
      const words = segment.trim().split(/\s+/).filter(Boolean);
      const chunks: string[] = [];
      let current = "";

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxLength) {
          current = candidate;
        } else {
          if (current) chunks.push(current);
          current = word.slice(0, maxLength);
        }
      }

      if (current) chunks.push(current);
      return chunks;
    });
}

const normalizedStringList = (maxLength: number) => z.preprocess(
  (value) => typeof value === "string" ? splitNormalizedString(value, maxLength) : value,
  z.array(z.string().max(maxLength)).default([]),
);

export const normalizedBusinessFactsSchema = z.object({
  business: z.object({
    name: z.string().max(200).optional(),
    legalName: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    stage: z.string().max(200).optional(),
    locations: normalizedStringList(200),
    website: z.string().max(500).optional(),
  }).catchall(jsonValueSchema).prefault({}),
  customers: z.object({
    segments: normalizedStringList(200),
    targetAudience: normalizedStringList(200),
    buyingTriggers: normalizedStringList(200),
    customerJourney: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  offerings: z.object({
    products: normalizedStringList(200),
    services: normalizedStringList(200),
    pricingModel: normalizedStringList(200),
    deliveryModel: normalizedStringList(200),
  }).catchall(jsonValueSchema).prefault({}),
  people: z.object({
    roles: normalizedStringList(200),
    owners: normalizedStringList(200),
    teams: normalizedStringList(200),
    responsibilities: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  sales: z.object({
    leadSources: normalizedStringList(200),
    salesProcess: normalizedStringList(500),
    channels: normalizedStringList(200),
    conversionIssues: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  workflows: z.object({
    coreProcesses: normalizedStringList(500),
    bottlenecks: normalizedStringList(500),
    handoffs: normalizedStringList(500),
    approvals: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  scheduling: z.object({
    appointments: normalizedStringList(500),
    calendars: normalizedStringList(200),
    constraints: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  payments: z.object({
    methods: normalizedStringList(200),
    cycles: normalizedStringList(200),
    painPoints: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  inventoryAssets: z.object({
    trackedItems: normalizedStringList(200),
    locations: normalizedStringList(200),
    constraints: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  communication: z.object({
    channels: normalizedStringList(200),
    frequency: normalizedStringList(200),
    issues: normalizedStringList(200),
  }).catchall(jsonValueSchema).prefault({}),
  tools: z.object({
    software: normalizedStringList(200),
    integrationNeeds: normalizedStringList(200),
    customProcesses: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  problems: z.object({
    topProblems: normalizedStringList(500),
    impact: normalizedStringList(500),
    urgency: normalizedStringList(200),
  }).catchall(jsonValueSchema).prefault({}),
  goals: z.object({
    objectives: normalizedStringList(500),
    successMetrics: normalizedStringList(500),
    timeframes: normalizedStringList(200),
  }).catchall(jsonValueSchema).prefault({}),
  constraints: z.object({
    compliance: normalizedStringList(500),
    policies: normalizedStringList(500),
    resourceLimits: normalizedStringList(500),
    riskFlags: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  automation: z.object({
    opportunities: normalizedStringList(500),
    manualSteps: normalizedStringList(500),
    triggers: normalizedStringList(500),
  }).catchall(jsonValueSchema).prefault({}),
  metadata: z.object({
    confidence: z.number().min(0).max(1).default(0),
    domainsCovered: normalizedStringList(100),
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
