import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  interviewAnswerSchema,
  interviewQuestionSchema,
  interviewSessionSchema,
  type InterviewAnswer,
} from "@/lib/ai/interview-contracts";
import { InterviewEngine } from "@/lib/ai/interview-engine";
import { SupabaseInterviewRepository } from "@/lib/ai/interview-supabase-repository";
import { InterviewScopeError, InterviewSessionNotFoundError, type InterviewRepository } from "@/lib/ai/interview-repository";
import { defaultInterviewCatalog } from "@/lib/ai/interview-catalog";

const customerId = "00000000-0000-4000-8000-000000000010";
const session = interviewSessionSchema.parse({
  id: "00000000-0000-4000-8000-000000000020",
  customerId,
  workspaceId: null,
  status: "in_progress",
  createdBy: "00000000-0000-4000-8000-000000000030",
  startedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

class FakeRepository implements InterviewRepository {
  constructor(private readonly answers: InterviewAnswer[] = []) {}
  async getSession() { return session; }
  async listLatestAnswers() { return this.answers; }
}

function makeAnswer() {
  return interviewAnswerSchema.parse({
    id: "00000000-0000-4000-8000-000000000040",
    customerId,
    onboardingSessionId: session.id,
    questionKey: "business.description",
    answerJson: { value: "A business" },
    normalizedFacts: { business: { description: "A business" } },
    answerStatus: "answered",
    isLatest: true,
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

test("reads scoped answers and returns deterministic next-question state", async () => {
  const catalog = {
    domains: defaultInterviewCatalog.domains.slice(0, 1),
    questions: [interviewQuestionSchema.parse({
      key: "business.name",
      domain: "business",
      prompt: "Name",
      kind: "text",
      required: true,
      metadata: { targetPaths: ["business.name"] },
    })],
  };
  const state = await new InterviewEngine(new FakeRepository([makeAnswer()])).evaluate({
    sessionId: session.id,
    authenticatedCustomerId: customerId,
    catalog,
    completionConfig: { minDomainsWithEvidence: 2, minConfidence: 1 },
  });
  assert.equal(state.session.customerId, customerId);
  assert.equal(state.facts.business.description, "A business");
  assert.equal(state.nextQuestion?.key, "business.name");
});

test("rejects an authenticated customer/session mismatch", async () => {
  await assert.rejects(
    () => new InterviewEngine(new FakeRepository()).evaluate({
      sessionId: session.id,
      authenticatedCustomerId: "00000000-0000-4000-8000-000000000099",
    }),
    InterviewScopeError,
  );
});

test("throws when the requested session does not exist", async () => {
  const missingRepository: InterviewRepository = {
    async getSession() { return null; },
    async listLatestAnswers() { return []; },
  };

  await assert.rejects(
    () => new InterviewEngine(missingRepository).evaluate({
      sessionId: session.id,
      authenticatedCustomerId: customerId,
    }),
    InterviewSessionNotFoundError,
  );
});

test("scopes Supabase answer reads to the persisted session customer", async () => {
  const calls: string[] = [];
  const sessionRow = {
    id: session.id,
    customer_id: customerId,
    workspace_id: null,
    status: "in_progress",
    version: 1,
    started_at: session.startedAt,
    completed_at: null,
    last_question_key: null,
    created_by: session.createdBy,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    metadata: {},
  };
  const answerRow = {
    id: "00000000-0000-4000-8000-000000000041",
    customer_id: customerId,
    onboarding_session_id: session.id,
    question_key: "business.description",
    answer_json: { value: "A business" },
    normalized_facts: { business: { description: "A business" } },
    answer_status: "answered",
    is_latest: true,
    version: 1,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
  const supabase = {
    from(table: string) {
      calls.push(`from:${table}`);
      const result = table === "onboarding_sessions"
        ? { data: sessionRow, error: null }
        : { data: [answerRow], error: null };
      type MockQuery = {
        select(value: string): MockQuery;
        eq(column: string, value: string): MockQuery;
        in(column: string, value: string[]): MockQuery;
        order(column: string): MockQuery;
        maybeSingle(): Promise<typeof result>;
        then(resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown): Promise<unknown>;
      };
      const query = {} as MockQuery;
      Object.assign(query, {
        select(value: string) { calls.push(`select:${value}`); return query; },
        eq(column: string, value: string) { calls.push(`eq:${column}:${value}`); return query; },
        in(column: string, value: string[]) { calls.push(`in:${column}:${value.join(",")}`); return query; },
        order(column: string) { calls.push(`order:${column}`); return query; },
        maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
      });
      return query;
    },
  } as unknown as SupabaseClient;
  const repository = new SupabaseInterviewRepository(supabase);

  const answers = await repository.listLatestAnswers(session.id, customerId);
  assert.equal(answers.length, 1);
  assert.equal(calls.includes(`eq:id:${session.id}`), true);
  assert.equal(calls.includes(`eq:customer_id:${customerId}`), true);
  assert.equal(calls.includes(`eq:onboarding_session_id:${session.id}`), true);
  assert.equal(calls.includes(`eq:customer_id:${customerId}`), true);

  calls.length = 0;
  await assert.rejects(
    () => repository.listLatestAnswers(session.id, "00000000-0000-4000-8000-000000000099"),
    InterviewScopeError,
  );
  assert.deepEqual(calls.filter((call) => call === "from:onboarding_answers"), []);
});
