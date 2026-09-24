import {
  jsonObjectSchema,
  normalizedBusinessFactsSchema,
  type InterviewAnswer,
  type JsonValue,
  type NormalizedBusinessFacts,
} from "@/lib/ai/interview-contracts";

export type FactObject = { [key: string]: JsonValue };

export function isJsonObject(value: unknown): value is FactObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyValue);
  if (typeof value === "object") {
    return Object.values(value).every(isEmptyValue);
  }
  return false;
}

export function getFactAtPath(value: unknown, path: string): JsonValue | undefined {
  const parsedValue = jsonObjectSchema.safeParse(value);
  if (!parsedValue.success) return undefined;
  if (!path.trim()) return parsedValue.data;

  let current: JsonValue | undefined = parsedValue.data;
  for (const segment of path.split(".").filter(Boolean)) {
    if (!isJsonObject(current)) return undefined;
    current = current[segment];
  }
  return current;
}

export function hasMeaningfulFact(value: unknown): boolean {
  return !isEmptyValue(value);
}

function mergeJsonValues(base: JsonValue, incoming: JsonValue): JsonValue {
  if (!isJsonObject(base) || !isJsonObject(incoming)) return incoming;

  const merged: FactObject = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    const current = merged[key];
    merged[key] = current !== undefined && isJsonObject(current) && isJsonObject(value)
      ? mergeJsonValues(current, value)
      : value;
  }
  return merged;
}

export function mergeFactObjects(base: JsonValue, incoming: JsonValue): JsonValue {
  return mergeJsonValues(base, incoming);
}

function compareAnswers(left: InterviewAnswer, right: InterviewAnswer): number {
  const updatedComparison = left.updatedAt.localeCompare(right.updatedAt);
  if (updatedComparison !== 0) return updatedComparison;

  const createdComparison = left.createdAt.localeCompare(right.createdAt);
  if (createdComparison !== 0) return createdComparison;

  const versionComparison = left.version - right.version;
  if (versionComparison !== 0) return versionComparison;

  return left.id.localeCompare(right.id);
}

export function getLatestAnswers(answers: InterviewAnswer[]): InterviewAnswer[] {
  const latestByQuestion = new Map<string, InterviewAnswer>();

  for (const answer of answers) {
    if (!answer.isLatest || !["answered", "updated"].includes(answer.answerStatus)) continue;

    const current = latestByQuestion.get(answer.questionKey);
    if (!current || compareAnswers(current, answer) < 0) {
      latestByQuestion.set(answer.questionKey, answer);
    }
  }

  return [...latestByQuestion.values()].sort(compareAnswers);
}

export function mergeAnswerFacts(answers: InterviewAnswer[]): NormalizedBusinessFacts {
  const merged = getLatestAnswers(answers).reduce<JsonValue>(
    (facts, answer) => mergeJsonValues(facts, jsonObjectSchema.parse(answer.normalizedFacts)),
    {},
  );

  return normalizedBusinessFactsSchema.parse(jsonObjectSchema.parse(merged));
}

export function domainHasEvidence(facts: NormalizedBusinessFacts, domainKey: string): boolean {
  return hasMeaningfulFact(getFactAtPath(facts, domainKey));
}

export function pathsHaveEvidence(
  facts: NormalizedBusinessFacts,
  paths: string[],
): boolean {
  return paths.length > 0 && paths.every((path) => hasMeaningfulFact(getFactAtPath(facts, path)));
}
