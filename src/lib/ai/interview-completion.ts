import type {
  CompletionResult,
  CompletionThresholdConfig,
  InterviewDomain,
  NormalizedBusinessFacts,
} from "@/lib/ai/interview-contracts";
import { domainHasEvidence } from "@/lib/ai/interview-facts";

export interface CompletionEvaluationInput {
  facts: NormalizedBusinessFacts;
  relevantDomains: InterviewDomain[];
  config: CompletionThresholdConfig;
  hasNextQuestion: boolean;
}

export function evaluateCompletion({
  facts,
  relevantDomains,
  config,
  hasNextQuestion,
}: CompletionEvaluationInput): CompletionResult {
  const coveredDomains = relevantDomains
    .filter((domain) => domainHasEvidence(facts, domain.key))
    .map((domain) => domain.key);
  const covered = new Set(coveredDomains);
  const requiredDomainKeys = new Set([
    ...config.requiredDomains,
    ...relevantDomains.filter((domain) => domain.required).map((domain) => domain.key),
  ]);
  const missingRequiredDomains = [...requiredDomainKeys].filter((domain) => !covered.has(domain));
  const missingRelevantDomains = relevantDomains
    .map((domain) => domain.key)
    .filter((domain) => !covered.has(domain));
  const missingDomains = [...new Set([...missingRequiredDomains, ...missingRelevantDomains])];
  const confidence = relevantDomains.length === 0
    ? 0
    : coveredDomains.length / relevantDomains.length;
  const meetsDomainCount = coveredDomains.length >= config.minDomainsWithEvidence;
  const meetsConfidence = confidence >= config.minConfidence;
  const isComplete = missingRequiredDomains.length === 0 && meetsDomainCount && meetsConfidence;
  const status = isComplete ? "complete" : hasNextQuestion ? "incomplete" : "blocked";
  const reason = isComplete
    ? "The configured completion thresholds are satisfied."
    : hasNextQuestion
      ? "More relevant information is needed before completion."
      : "Completion thresholds are not satisfied and no valid next question is available.";

  return {
    status,
    state: {
      isComplete,
      thresholdConfig: config,
      coveredDomains,
      missingDomains,
      confidence,
      reason,
    },
    nextQuestionKey: null,
    finalFacts: isComplete ? facts : undefined,
    message: reason,
  };
}
