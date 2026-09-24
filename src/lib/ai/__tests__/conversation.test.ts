import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  buildConversationContext,
  generateConversationResponse,
  isSemanticallyRepeatedQuestion,
  normalizeConversationFacts,
  validateConversationResponse,
} from "@/lib/ai/conversation";
import { normalizedBusinessFactsSchema } from "@/lib/ai/interview-contracts";

const baseInput = {
  message: "Manage our warehouse and inventory.",
  currentQuestionKey: "business.description",
  knownFacts: normalizedBusinessFactsSchema.parse({}),
  answeredQuestionKeys: [],
  conversationHistory: [],
};

test("extracts an initial natural-language business fact", () => {
  const facts = normalizeConversationFacts(baseInput.knownFacts, {
    business: { description: baseInput.message },
  });

  assert.equal(facts.business.description, baseInput.message);
});

test("accepts a contextual follow-up selected from the supported catalog", () => {
  const response = validateConversationResponse({
    message: "Let's map how inventory moves through the warehouse.",
    facts: { workflows: { coreProcesses: ["Receiving shipments"] } },
    confidence: 0.9,
    needsClarification: false,
    nextQuestion: {
      questionKey: "workflows.coreProcesses",
      prompt: "What happens when a shipment arrives?",
    },
  }, baseInput);

  assert.equal(response.nextQuestion?.questionKey, "customers.segments");
  assert.equal(response.nextQuestion?.prompt, "Who are the main customers or customer groups?");
});

test("passes accumulated conversation context to the AI request", () => {
  const context = buildConversationContext({
    ...baseInput,
    answeredQuestionKeys: ["business.description"],
    conversationHistory: [{ questionKey: "business.description", answer: "We run a warehouse." }],
  });

  assert.equal(context.conversationHistory[0].answer, "We run a warehouse.");
  assert.deepEqual(context.answeredQuestionKeys, ["business.description"]);
  assert.ok(context.structuredCoverageGuidance.length > 0);
});

test("falls back safely when the AI provider fails", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousProvider = process.env.AI_PROVIDER;
  const previousFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.AI_PROVIDER = "openai";
  globalThis.fetch = async () => new Response("provider unavailable", { status: 503 });

  try {
    const response = await generateConversationResponse(baseInput);
    assert.equal(response.nextQuestion?.questionKey, "workflows.coreProcesses");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
  }
});

test("supports arbitrary business facts without industry-specific logic", () => {
  const facts = normalizeConversationFacts(baseInput.knownFacts, {
    business: { description: "We provide compliance consulting to regulated teams." },
    people: { responsibilities: ["Review client evidence"] },
    workflows: { coreProcesses: ["Intake, review, and report findings"] },
  });

  assert.equal(facts.business.description, "We provide compliance consulting to regulated teams.");
  assert.deepEqual(facts.people.responsibilities, ["Review client evidence"]);
});

test("rejects malformed AI conversation output", () => {
  assert.throws(
    () => validateConversationResponse({ message: 42, facts: {}, nextQuestion: null }, baseInput),
    z.ZodError,
  );
});

test("does not accept a repeated or unsupported next question", () => {
  const response = validateConversationResponse({
    message: "I have enough context on that part.",
    facts: {},
    nextQuestion: {
      questionKey: "customers.segments",
      prompt: "Who are your customers?",
    },
  }, { ...baseInput, currentQuestionKey: "customers.segments", answeredQuestionKeys: ["customers.segments"] });

  assert.notEqual(response.nextQuestion?.questionKey, "customers.segments");
});

test("rejects an identical question after it has already been asked", () => {
  assert.equal(isSemanticallyRepeatedQuestion(
    "customers.segments",
    "Who are the main customers or customer groups?",
    {
      ...baseInput,
      conversationHistory: [{
        questionKey: "customers.segments",
        prompt: "Who are the main customers or customer groups?",
        answer: "Wholesale buyers",
      }],
    },
  ), true);
});

test("rejects a semantically repeated question with different wording", () => {
  assert.equal(isSemanticallyRepeatedQuestion(
    "customers.segments",
    "Can you describe the customer groups your company serves?",
    {
      ...baseInput,
      conversationHistory: [{
        questionKey: "customers.segments",
        prompt: "Who are the main customers or customer groups?",
        answer: "Wholesale buyers",
      }],
    },
  ), true);
});

test("fallback moves from sufficient restaurant customer evidence to another area", async () => {
  const response = await generateConversationResponse({
    message: "We serve local families, office groups, and event guests. We track guests, reservations, orders, and delivery.",
    currentQuestionKey: "customers.segments",
    knownFacts: normalizedBusinessFactsSchema.parse({
      business: { description: "A neighborhood restaurant" },
      customers: { segments: ["local families", "office groups", "event guests"] },
    }),
    answeredQuestionKeys: ["business.description", "customers.segments"],
    conversationHistory: [{
      questionKey: "business.description",
      prompt: "What does the business do, and what context should the system understand?",
      answer: "A neighborhood restaurant",
    }],
  });

  assert.notEqual(response.nextQuestion?.questionKey, "customers.segments");
  assert.notEqual(response.nextQuestion?.prompt, "What else should Northstar understand about how this part of the business works?");
});

test("preserves meaningful warehouse facts and selects a different follow-up", async () => {
  const response = await generateConversationResponse({
    message: "Receiving, putaway, picking, and fulfillment are tracked by warehouse staff.",
    currentQuestionKey: "workflows.coreProcesses",
    knownFacts: normalizedBusinessFactsSchema.parse({
      business: { description: "A regional warehouse" },
      workflows: { coreProcesses: ["Receiving", "putaway", "picking", "fulfillment"] },
    }),
    answeredQuestionKeys: ["business.description", "workflows.coreProcesses"],
    conversationHistory: [],
  });

  assert.equal((response.facts.workflows as { coreProcesses?: unknown } | undefined)?.coreProcesses, "Receiving, putaway, picking, and fulfillment are tracked by warehouse staff.");
  assert.notEqual(response.nextQuestion?.questionKey, "workflows.coreProcesses");
});

test("supports arbitrary businesses without industry-specific question logic", async () => {
  const response = await generateConversationResponse({
    message: "We review compliance evidence and deliver findings to regulated software teams.",
    currentQuestionKey: "business.description",
    knownFacts: normalizedBusinessFactsSchema.parse({}),
    answeredQuestionKeys: [],
    conversationHistory: [],
  });

  assert.equal((response.facts.business as { description?: unknown } | undefined)?.description, "We review compliance evidence and deliver findings to regulated software teams.");
  assert.ok(response.nextQuestion?.questionKey);
});

test("returns no next question when the completion state is represented by an exhausted catalog", () => {
  const response = validateConversationResponse({
    message: "That gives me enough context.",
    facts: {},
    nextQuestion: null,
  }, {
    ...baseInput,
    currentQuestionKey: "business.description",
    knownFacts: normalizedBusinessFactsSchema.parse({
      business: { description: "A business" },
      customers: { segments: ["Customers"] },
      offerings: { services: ["Services"] },
      workflows: { coreProcesses: ["Processes"] },
      problems: { topProblems: ["Problems"] },
      goals: { objectives: ["Goals"] },
    }),
    answeredQuestionKeys: [
      "business.description", "customers.segments", "offerings.services", "workflows.coreProcesses",
      "problems.topProblems", "goals.objectives",
    ],
  });

  assert.equal(response.nextQuestion, null);
});
