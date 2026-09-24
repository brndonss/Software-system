import assert from "node:assert/strict";
import test from "node:test";
import { interviewAnswerSchema, normalizedBusinessFactsSchema } from "@/lib/ai/interview-contracts";
import {
  getFactAtPath,
  getLatestAnswers,
  isEmptyValue,
  mergeAnswerFacts,
} from "@/lib/ai/interview-facts";

const ids = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];

function answer(id: string, questionKey: string, normalizedFacts: Record<string, unknown>, overrides = {}) {
  return interviewAnswerSchema.parse({
    id,
    customerId: "00000000-0000-4000-8000-000000000010",
    onboardingSessionId: "00000000-0000-4000-8000-000000000020",
    questionKey,
    answerJson: { value: normalizedFacts },
    normalizedFacts,
    answerStatus: "answered",
    isLatest: true,
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
}

test("filters stale, superseded, rejected, and older answers", () => {
  const answers = [
    answer(ids[0], "business", { business: { name: "Old" } }),
    answer(ids[1], "business", { business: { name: "New" } }, { version: 2, updatedAt: "2026-01-02T00:00:00.000Z" }),
    answer(ids[2], "ignored", { business: { legalName: "No" } }, { isLatest: false }),
    answer("00000000-0000-4000-8000-000000000004", "rejected", { business: { stage: "No" } }, { answerStatus: "rejected" }),
  ];

  assert.deepEqual(getLatestAnswers(answers).map((item) => item.questionKey), ["business"]);
  assert.equal(getFactAtPath(mergeAnswerFacts(answers), "business.name"), "New");
});

test("merges nested facts with later scalar precedence", () => {
  const facts = mergeAnswerFacts([
    answer(ids[0], "one", { business: { name: "First", locations: ["A"] } }),
    answer(ids[1], "two", { business: { name: "Second", description: "Useful" } }, { updatedAt: "2026-01-02T00:00:00.000Z" }),
  ]);

  assert.equal(facts.business.name, "Second");
  assert.deepEqual(facts.business.locations, ["A"]);
  assert.equal(facts.business.description, "Useful");
});

test("recognizes empty values recursively", () => {
  assert.equal(isEmptyValue("  "), true);
  assert.equal(isEmptyValue([]), true);
  assert.equal(isEmptyValue({ nested: [] }), true);
  assert.equal(isEmptyValue({ nested: "known" }), false);
});

test("excludes superseded answers explicitly", () => {
  const answers = [
    answer("00000000-0000-4000-8000-000000000005", "superseded", { business: { name: "Old" } }, { answerStatus: "superseded" }),
    answer("00000000-0000-4000-8000-000000000006", "rejected", { business: { name: "Rejected" } }, { answerStatus: "rejected" }),
  ];

  assert.deepEqual(getLatestAnswers(answers), []);
});

test("uses version to break equal timestamp ties", () => {
  const answers = [
    answer("00000000-0000-4000-8000-000000000007", "business", { business: { name: "Version one" } }),
    answer("00000000-0000-4000-8000-000000000008", "business", { business: { name: "Version two" } }, { version: 2 }),
  ];

  assert.equal(getFactAtPath(mergeAnswerFacts(answers), "business.name"), "Version two");
});

test("handles missing and malformed fact paths safely", () => {
  const facts = normalizedBusinessFactsSchema.parse({ business: { name: "Known" } });

  assert.equal(getFactAtPath(facts, "business.missing"), undefined);
  assert.equal(getFactAtPath(facts, "missing.nested"), undefined);
  assert.equal(getFactAtPath(facts, "business..name"), "Known");
  assert.deepEqual(getFactAtPath(facts, "business."), facts.business);
});
test("normalizes conversational string answers for list facts", () => {
  const facts = normalizedBusinessFactsSchema.parse({
    customers: { segments: "Residential customers" },
  });

  assert.deepEqual(facts.customers.segments, ["Residential customers"]);
});
