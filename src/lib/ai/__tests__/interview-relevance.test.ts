import assert from "node:assert/strict";
import test from "node:test";
import { interviewDomainSchema, normalizedBusinessFactsSchema } from "@/lib/ai/interview-contracts";
import { evaluateRelevanceRule, getRelevantDomains, isDomainRelevant } from "@/lib/ai/interview-relevance";

const facts = normalizedBusinessFactsSchema.parse({
  business: { name: "Example" },
  sales: { channels: ["web", "referral"] },
  payments: { methods: ["card"] },
});

const domain = (operator: "exists" | "equals" | "contains" | "not_empty", value?: string | string[]) =>
  interviewDomainSchema.parse({
    key: "test",
    label: "Test",
    description: "Test domain",
    relevanceRules: [{ field: "business.name", operator, value }],
  });

test("evaluates all relevance operators", () => {
  assert.equal(evaluateRelevanceRule(facts, domain("exists").relevanceRules[0]), true);
  assert.equal(evaluateRelevanceRule(facts, domain("not_empty").relevanceRules[0]), true);
  assert.equal(evaluateRelevanceRule(facts, domain("equals", "Example").relevanceRules[0]), true);
  assert.equal(evaluateRelevanceRule(facts, domain("contains", "amp").relevanceRules[0]), true);
  assert.equal(evaluateRelevanceRule(facts, domain("equals", "Other").relevanceRules[0]), false);
});

test("evaluates array contains rules and sorts relevant domains deterministically", () => {
  const salesRule = interviewDomainSchema.parse({
    key: "sales",
    label: "Sales",
    description: "Sales",
    priority: 10,
    relevanceRules: [{ field: "sales.channels", operator: "contains", value: "web" }],
  });
  const relevant = getRelevantDomains(facts, [salesRule, domain("not_empty")]);
  assert.deepEqual(relevant.map((item) => item.key), ["sales", "test"]);
});

test("required domains remain relevant when their rules fail", () => {
  const requiredDomain = interviewDomainSchema.parse({
    key: "required",
    label: "Required",
    description: "Required",
    required: true,
    relevanceRules: [{ field: "business.missing", operator: "exists" }],
  });

  assert.equal(isDomainRelevant(facts, requiredDomain), true);
});
