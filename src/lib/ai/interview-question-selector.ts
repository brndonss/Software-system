import type {
  InterviewAnswer,
  InterviewQuestion,
  JsonValue,
  NormalizedBusinessFacts,
  NextQuestionDecision,
} from "@/lib/ai/interview-contracts";
import { getFactAtPath, getLatestAnswers, hasMeaningfulFact, isEmptyValue, pathsHaveEvidence } from "@/lib/ai/interview-facts";
import type { InterviewDomain } from "@/lib/ai/interview-contracts";

interface QuestionMetadata {
  targetPaths: string[];
  followUpFor: string[];
  informationValue: number;
}

export interface QuestionSelection {
  question: InterviewQuestion | null;
  decision: NextQuestionDecision | null;
}

function isStringArray(value: JsonValue | undefined): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function getMetadata(question: InterviewQuestion): QuestionMetadata {
  const metadata = question.metadata;
  return {
    targetPaths: isStringArray(metadata.targetPaths) ? metadata.targetPaths : [],
    followUpFor: isStringArray(metadata.followUpFor) ? metadata.followUpFor : [],
    informationValue: typeof metadata.informationValue === "number" ? metadata.informationValue : 0,
  };
}

function answersByQuestion(answers: InterviewAnswer[]): Map<string, InterviewAnswer> {
  return new Map(getLatestAnswers(answers).map((answer) => [answer.questionKey, answer]));
}

function hasMeaningfulAnswer(answer: InterviewAnswer | undefined): boolean {
  return answer !== undefined && !isEmptyValue(answer.answerJson);
}

export function areDependenciesSatisfied(
  question: InterviewQuestion,
  answers: InterviewAnswer[],
): boolean {
  const byQuestion = answersByQuestion(answers);
  return question.dependsOn.every((dependency) => hasMeaningfulAnswer(byQuestion.get(dependency)));
}

function isFollowUpActive(
  question: InterviewQuestion,
  answers: Map<string, InterviewAnswer>,
): boolean {
  const metadata = getMetadata(question);
  return metadata.followUpFor.length > 0
    && metadata.followUpFor.some((questionKey) => hasMeaningfulAnswer(answers.get(questionKey)));
}

function isQuestionRedundant(
  question: InterviewQuestion,
  facts: NormalizedBusinessFacts,
  answers: Map<string, InterviewAnswer>,
): boolean {
  const answer = answers.get(question.key);
  if (hasMeaningfulAnswer(answer)) return true;

  const targetPaths = getMetadata(question).targetPaths;
  if (targetPaths.length > 0 && pathsHaveEvidence(facts, targetPaths)) return true;

  return false;
}

function missingTargetCount(
  question: InterviewQuestion,
  facts: NormalizedBusinessFacts,
): number {
  return getMetadata(question).targetPaths.filter(
    (path) => !hasMeaningfulFact(getFactAtPath(facts, path)),
  ).length;
}

function domainPriority(question: InterviewQuestion, domains: Map<string, InterviewDomain>): number {
  return domains.get(question.domain)?.priority ?? 0;
}

export function selectNextQuestion(
  questions: InterviewQuestion[],
  domains: InterviewDomain[],
  relevantDomains: InterviewDomain[],
  facts: NormalizedBusinessFacts,
  answers: InterviewAnswer[],
): QuestionSelection {
  const answerMap = answersByQuestion(answers);
  const relevantKeys = new Set(relevantDomains.map((domain) => domain.key));
  const domainMap = new Map(domains.map((domain) => [domain.key, domain]));

  const candidates = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => relevantKeys.has(question.domain))
    .filter(({ question }) => areDependenciesSatisfied(question, answers))
    .filter(({ question }) => !isQuestionRedundant(question, facts, answerMap))
    .map(({ question, index }) => {
      const metadata = getMetadata(question);
      const followUp = isFollowUpActive(question, answerMap);
      const missing = missingTargetCount(question, facts);
      const score = (question.required ? 100000 : 0)
        + (followUp ? 10000 : 0)
        + (missing * 1000)
        + (domainPriority(question, domainMap) * 10)
        + metadata.informationValue;

      return { question, index, followUp, missing, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = candidates[0];
  if (!selected) return { question: null, decision: null };

  const reason = selected.followUp
    ? "A previous answer created an important unresolved follow-up."
    : selected.missing > 0
      ? "This question fills high-value information that is still missing."
      : "This question covers a relevant business domain.";

  return {
    question: selected.question,
    decision: {
      domain: selected.question.domain,
      questionKey: selected.question.key,
      reason,
      confidence: selected.missing > 0 ? 1 : 0.5,
    },
  };
}
