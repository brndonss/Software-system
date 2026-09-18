import assert from "node:assert/strict";
import test from "node:test";
import {
  interviewAnswerSchema,
  interviewDomainSchema,
  interviewQuestionSchema,
  normalizedBusinessFactsSchema,
} from "@/lib/ai/interview-contracts";
import { selectNextQuestion } from "@/lib/ai/interview-question-selector";

const domain = interviewDomainSchema.parse({ key: "business", label: "Business", description: "Business", priority: 10 });
const facts = normalizedBusinessFactsSchema.parse({});
const question = (key: string, metadata: Record<string, unknown>, overrides = {}) => interviewQuestionSchema.parse({
  key,
  domain: "business",
  prompt: key,
  kind: "text",
  metadata,
  ...overrides,
});
const answer = (questionKey: string, answerValue: unknown, normalizedFacts: Record<string, unknown> = {}) => interviewAnswerSchema.parse({
  id: questionKey === "known"
    ? "00000000-0000-4000-8000-000000000030"
    : "00000000-0000-4000-8000-000000000031",
  customerId: "00000000-0000-4000-8000-000000000010",
  onboardingSessionId: "00000000-0000-4000-8000-000000000020",
  questionKey,
  answerJson: { value: answerValue },
  normalizedFacts,
  answerStatus: "answered",
  isLatest: true,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("prevents redundant questions and uses stable tie-breaking", () => {
  const questions = [
    question("known", { targetPaths: ["business.name"], informationValue: 100 }),
    question("first", { targetPaths: ["business.description"], informationValue: 10 }),
    question("second", { targetPaths: ["business.stage"], informationValue: 10 }),
  ];
  const result = selectNextQuestion(questions, [domain], [domain], normalizedBusinessFactsSchema.parse({ business: { name: "Known" } }), [answer("known", "Known", { business: { name: "Known" } })]);
  assert.equal(result.question?.key, "first");
});

test("does not ask for a target fact already known from another answer", () => {
  const result = selectNextQuestion(
    [question("unasked-name", { targetPaths: ["business.name"] })],
    [domain],
    [domain],
    normalizedBusinessFactsSchema.parse({ business: { name: "Known elsewhere" } }),
    [answer("other-question", "Known elsewhere", { business: { name: "Known elsewhere" } })],
  );

  assert.equal(result.question, null);
});

test("excludes questions from irrelevant domains", () => {
  const irrelevant = interviewDomainSchema.parse({ key: "other", label: "Other", description: "Other" });
  const otherQuestion = question("other-question", { targetPaths: ["business.stage"] });
  const result = selectNextQuestion(
    [question("business-question", { targetPaths: ["business.name"] }), { ...otherQuestion, domain: "other" }],
    [domain, irrelevant],
    [domain],
    facts,
    [],
  );

  assert.equal(result.question?.key, "business-question");
});

test("prioritizes an active follow-up and blocks unsatisfied dependencies", () => {
  const questions = [
    question("parent", { targetPaths: ["business.name"] }),
    question("follow-up", { targetPaths: ["business.description"], followUpFor: ["parent"], informationValue: 1 }),
    question("blocked", { targetPaths: ["business.stage"] }, { dependsOn: ["missing"] }),
  ];
  const result = selectNextQuestion(questions, [domain], [domain], facts, [answer("parent", "Known", { business: { name: "Known" } })]);
  assert.equal(result.question?.key, "follow-up");
});
