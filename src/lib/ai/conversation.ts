import { z } from "zod";
import {
  jsonObjectSchema,
  normalizedBusinessFactsSchema,
  type JsonValue,
  type NormalizedBusinessFacts,
} from "@/lib/ai/interview-contracts";
import { defaultInterviewCatalog } from "@/lib/ai/interview-catalog";
import { mergeFactObjects, pathsHaveEvidence } from "@/lib/ai/interview-facts";

export const conversationResponseSchema = z.object({
  message: z.string().min(1).max(1200),
  facts: jsonObjectSchema.default({}),
  confidence: z.number().min(0).max(1).default(0),
  needsClarification: z.boolean().default(false),
  nextQuestion: z.object({
    questionKey: z.string().min(1).max(200),
    prompt: z.string().min(1).max(1000),
  }).nullable().default(null),
}).strict();

export type ConversationResponse = z.infer<typeof conversationResponseSchema>;

export type ConversationInput = {
  message: string;
  currentQuestionKey: string;
  knownFacts: NormalizedBusinessFacts;
  answeredQuestionKeys: string[];
  conversationHistory: { questionKey: string; answer: string; prompt?: string }[];
};

const conversationSystemPrompt = `You are Northstar, an AI business systems architect. Continue a calm, concise conversation with a business owner.

Understand the user's business from natural language. Extract only facts supported by the conversation. Decide the single most useful next thing to understand for designing that specific business system. Do not follow a fixed industry sequence. Do not expose internal domains, question keys, priorities, or catalog mechanics. Ask one contextual question at a time in natural language.

You must return only JSON matching this shape:
{
  "message": "A brief acknowledgment and transition, without a question list",
  "facts": { "supported fact groups": "new evidence only" },
  "confidence": 0.0,
  "needsClarification": false,
  "nextQuestion": { "questionKey": "one supported catalog key", "prompt": "one natural follow-up question" }
}

The backend validates every key, fact, question, and persistence action. Never execute tools, SQL, database operations, schema changes, provisioning, activation, or mutations. Preserve uncertainty instead of inventing facts.`;

function factsForQuestion(questionKey: string, message: string): Record<string, JsonValue> {
  const segments = questionKey.split(".").filter(Boolean);
  if (!segments.length) return {};

  const root: Record<string, JsonValue> = {};
  let current = root;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = message;
      return;
    }
    const nested: Record<string, JsonValue> = {};
    current[segment] = nested;
    current = nested;
  });
  return root;
}

function questionTargetPaths(questionKey: string): string[] {
  const question = defaultInterviewCatalog.questions.find((item) => item.key === questionKey);
  const targetPaths = question?.metadata.targetPaths;
  return Array.isArray(targetPaths) && targetPaths.every((path) => typeof path === "string")
    ? targetPaths
    : [];
}

function factsAfterCurrentAnswer(input: ConversationInput): NormalizedBusinessFacts {
  return normalizeConversationFacts(input.knownFacts, factsForQuestion(input.currentQuestionKey, input.message));
}

function normalizedPromptWords(prompt: string): Set<string> {
  const stopWords = new Set(["a", "about", "and", "are", "be", "does", "how", "in", "is", "of", "the", "this", "to", "what", "when", "which", "who", "your"]);
  return new Set(prompt.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)));
}

function promptsAreSemanticallySimilar(left: string, right: string): boolean {
  const leftWords = normalizedPromptWords(left);
  const rightWords = normalizedPromptWords(right);
  if (!leftWords.size || !rightWords.size) return false;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap >= 2 && overlap / Math.min(leftWords.size, rightWords.size) >= 0.6;
}

export function isSemanticallyRepeatedQuestion(
  questionKey: string,
  prompt: string,
  input: ConversationInput,
): boolean {
  const candidatePaths = questionTargetPaths(questionKey);
  const currentFacts = factsAfterCurrentAnswer(input);
  if (candidatePaths.length > 0 && pathsHaveEvidence(currentFacts, candidatePaths)) return true;

  return input.conversationHistory.some((historyItem) => {
    if (historyItem.questionKey === questionKey) return true;
    if (candidatePaths.length > 0 && candidatePaths.join("|") === questionTargetPaths(historyItem.questionKey).join("|")) return true;
    return Boolean(historyItem.prompt && promptsAreSemanticallySimilar(prompt, historyItem.prompt));
  });
}

function fallbackNextQuestion(input: ConversationInput) {
  const facts = factsAfterCurrentAnswer(input);
  const questions = new Map([
    ["business.description", { questionKey: "workflows.coreProcesses", prompt: "What happens when the main work begins, and what are the important steps through completion?" }],
    ["workflows.coreProcesses", { questionKey: "inventoryAssets.trackedItems", prompt: "How do you currently track the things, resources, or information involved in that work?" }],
    ["inventoryAssets.trackedItems", { questionKey: "goals.objectives", prompt: "What would make this part of the business easier, faster, or more reliable?" }],
  ]);
  const mapped = questions.get(input.currentQuestionKey);
  if (mapped
    && !input.answeredQuestionKeys.includes(mapped.questionKey)
    && !isSemanticallyRepeatedQuestion(mapped.questionKey, mapped.prompt, { ...input, knownFacts: facts })) {
    return mapped;
  }

  const next = defaultInterviewCatalog.questions
    .filter((question) => !input.answeredQuestionKeys.includes(question.key) && question.key !== input.currentQuestionKey)
    .filter((question) => {
      const targetPaths = questionTargetPaths(question.key);
      return targetPaths.length === 0 || !pathsHaveEvidence(facts, targetPaths);
    })
    .find((question) => !isSemanticallyRepeatedQuestion(question.key, question.prompt, { ...input, knownFacts: facts }));
  return next ? { questionKey: next.key, prompt: next.prompt } : null;
}

function catalogGuidance() {
  return defaultInterviewCatalog.questions.map((question) => ({
    questionKey: question.key,
    prompt: question.prompt,
    targetPaths: question.metadata.targetPaths ?? [],
  }));
}

export function buildConversationContext(input: ConversationInput) {
  return {
    currentQuestionKey: input.currentQuestionKey,
    userMessage: input.message,
    knownFacts: input.knownFacts,
    answeredQuestionKeys: input.answeredQuestionKeys,
    conversationHistory: input.conversationHistory,
    structuredCoverageGuidance: catalogGuidance(),
  };
}

function fallbackResponse(input: ConversationInput): ConversationResponse {
  const nextQuestion = fallbackNextQuestion(input);

  return conversationResponseSchema.parse({
    message: nextQuestion
      ? "Got it. I'm mapping how the work moves through your business."
      : "I have that context. Tell me what part of the work is most important to understand next.",
    facts: factsForQuestion(input.currentQuestionKey, input.message),
    confidence: 0.45,
    needsClarification: false,
    nextQuestion,
  });
}

export function normalizeConversationFacts(
  knownFacts: NormalizedBusinessFacts,
  incomingFacts: Record<string, JsonValue>,
): NormalizedBusinessFacts {
  return normalizedBusinessFactsSchema.parse(mergeFactObjects(knownFacts as unknown as JsonValue, incomingFacts));
}

export function validateConversationResponse(
  raw: unknown,
  input: ConversationInput,
): ConversationResponse {
  const parsed = conversationResponseSchema.parse(raw);
  const knownKeys = new Set(defaultInterviewCatalog.questions.map((question) => question.key));
  const effectiveInput = {
    ...input,
    knownFacts: normalizeConversationFacts(
      input.knownFacts,
      jsonObjectSchema.parse(mergeFactObjects(factsForQuestion(input.currentQuestionKey, input.message), parsed.facts)),
    ),
  };
  if (parsed.nextQuestion && (!knownKeys.has(parsed.nextQuestion.questionKey)
    || parsed.nextQuestion.questionKey === input.currentQuestionKey
    || input.answeredQuestionKeys.includes(parsed.nextQuestion.questionKey)
    || isSemanticallyRepeatedQuestion(parsed.nextQuestion.questionKey, parsed.nextQuestion.prompt, effectiveInput))) {
    return fallbackResponse(effectiveInput);
  }
  return parsed;
}

export async function generateConversationResponse(input: ConversationInput): Promise<ConversationResponse> {
  const fallback = fallbackResponse(input);
  if (!process.env.OPENAI_API_KEY || process.env.AI_PROVIDER !== "openai") return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4.1-mini",
        input: [
          { role: "system", content: conversationSystemPrompt },
          {
            role: "user",
            content: JSON.stringify(buildConversationContext(input)),
          },
        ],
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return fallback;

    const data = await response.json() as { output_text?: string };
    if (!data.output_text) return fallback;
    return validateConversationResponse(JSON.parse(data.output_text), input);
  } catch {
    return fallback;
  }
}
