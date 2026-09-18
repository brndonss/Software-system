import type {
  InterviewDomain,
  JsonValue,
  NormalizedBusinessFacts,
} from "@/lib/ai/interview-contracts";
import { getFactAtPath, hasMeaningfulFact } from "@/lib/ai/interview-facts";

export type RelevanceRule = InterviewDomain["relevanceRules"][number];

function valuesEqual(left: JsonValue, right: string | string[]): boolean {
  if (Array.isArray(right)) {
    return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

export function evaluateRelevanceRule(
  facts: NormalizedBusinessFacts,
  rule: RelevanceRule,
): boolean {
  const fact = getFactAtPath(facts, rule.field);

  switch (rule.operator) {
    case "exists":
      return fact !== undefined;
    case "not_empty":
      return hasMeaningfulFact(fact);
    case "equals":
      return rule.value !== undefined && fact !== undefined && valuesEqual(fact, rule.value);
    case "contains":
      if (rule.value === undefined) return false;
      if (typeof fact === "string") {
        return Array.isArray(rule.value)
          ? rule.value.some((value) => fact.includes(value))
          : fact.includes(rule.value);
      }
      if (Array.isArray(fact)) {
        return Array.isArray(rule.value)
          ? rule.value.every((value) => fact.includes(value))
          : fact.includes(rule.value);
      }
      return false;
  }
}

export function isDomainRelevant(
  facts: NormalizedBusinessFacts,
  domain: InterviewDomain,
): boolean {
  if (domain.required || domain.relevanceRules.length === 0) return true;
  return domain.relevanceRules.every((rule) => evaluateRelevanceRule(facts, rule));
}

export function getRelevantDomains(
  facts: NormalizedBusinessFacts,
  domains: InterviewDomain[],
): InterviewDomain[] {
  return domains
    .filter((domain) => isDomainRelevant(facts, domain))
    .sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key));
}
