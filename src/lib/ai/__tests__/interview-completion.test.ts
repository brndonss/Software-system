import assert from "node:assert/strict";
import test from "node:test";
import { completionThresholdConfigSchema, normalizedBusinessFactsSchema, interviewDomainSchema } from "@/lib/ai/interview-contracts";
import { evaluateCompletion } from "@/lib/ai/interview-completion";

const domains = [
  interviewDomainSchema.parse({ key: "business", label: "Business", description: "Business", required: true }),
  interviewDomainSchema.parse({ key: "customers", label: "Customers", description: "Customers" }),
  interviewDomainSchema.parse({ key: "goals", label: "Goals", description: "Goals" }),
];

function evaluate(facts: Record<string, unknown>, config: Record<string, unknown>, hasNextQuestion = true) {
  return evaluateCompletion({
    facts: normalizedBusinessFactsSchema.parse(facts),
    relevantDomains: domains,
    config: completionThresholdConfigSchema.parse(config),
    hasNextQuestion,
  });
}

test("uses configurable thresholds and returns complete", () => {
  const result = evaluate(
    { business: { name: "Known" }, customers: { segments: ["A"] } },
    { minDomainsWithEvidence: 2, minConfidence: 0.5, requiredDomains: ["business"] },
  );
  assert.equal(result.status, "complete");
  assert.equal(result.state.isComplete, true);
  assert.equal(result.finalFacts?.business.name, "Known");
});

test("returns incomplete when a valid next question remains", () => {
  const result = evaluate({ business: { name: "Known" } }, { minDomainsWithEvidence: 3, minConfidence: 1, requiredDomains: ["business"] });
  assert.equal(result.status, "incomplete");
  assert.equal(result.state.isComplete, false);
});

test("returns blocked when thresholds fail and no question is available", () => {
  const result = evaluate({ business: { name: "Known" } }, { minDomainsWithEvidence: 3, minConfidence: 1, requiredDomains: ["business"] }, false);
  assert.equal(result.status, "blocked");
});

test("does not complete with zero relevant domains", () => {
  const result = evaluateCompletion({
    facts: normalizedBusinessFactsSchema.parse({}),
    relevantDomains: [],
    config: completionThresholdConfigSchema.parse({ minDomainsWithEvidence: 1, minConfidence: 0 }),
    hasNextQuestion: false,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.state.isComplete, false);
});
