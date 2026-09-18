import type { SupabaseClient } from "@supabase/supabase-js";
import {
  interviewAnswerSchema,
  interviewSessionSchema,
  type InterviewAnswer,
  type InterviewSession,
} from "@/lib/ai/interview-contracts";
import {
  InterviewScopeError,
  type InterviewRepository,
} from "@/lib/ai/interview-repository";

interface InterviewSessionRow {
  id: string;
  customer_id: string;
  workspace_id: string | null;
  status: InterviewSession["status"];
  version: number;
  started_at: string;
  completed_at: string | null;
  last_question_key: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: unknown;
}

interface InterviewAnswerRow {
  id: string;
  customer_id: string;
  onboarding_session_id: string;
  question_key: string;
  answer_json: unknown;
  normalized_facts: unknown;
  answer_status: InterviewAnswer["answerStatus"];
  is_latest: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export class SupabaseInterviewRepository implements InterviewRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getSession(sessionId: string, customerId: string): Promise<InterviewSession | null> {
    const { data, error } = await this.supabase
      .from("onboarding_sessions")
      .select("id, customer_id, workspace_id, status, version, started_at, completed_at, last_question_key, created_by, created_at, updated_at, metadata")
      .eq("id", sessionId)
      .eq("customer_id", customerId)
      .maybeSingle<InterviewSessionRow>();

    if (error) throw new Error(`Unable to load onboarding session: ${error.message}`);
    if (!data) return null;

    return interviewSessionSchema.parse({
      id: data.id,
      customerId: data.customer_id,
      workspaceId: data.workspace_id,
      status: data.status,
      version: data.version,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      lastQuestionKey: data.last_question_key,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      metadata: data.metadata,
    });
  }

  async listLatestAnswers(sessionId: string, customerId: string): Promise<InterviewAnswer[]> {
    const session = await this.getSession(sessionId, customerId);
    if (!session) return [];
    if (session.customerId !== customerId) {
      throw new InterviewScopeError("Interview session does not belong to the requested customer");
    }

    const { data, error } = await this.supabase
      .from("onboarding_answers")
      .select("id, customer_id, onboarding_session_id, question_key, answer_json, normalized_facts, answer_status, is_latest, version, created_at, updated_at")
      .eq("onboarding_session_id", sessionId)
      .eq("customer_id", session.customerId)
      .eq("is_latest", true)
      .in("answer_status", ["answered", "updated"])
      .order("updated_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Unable to load onboarding answers: ${error.message}`);

    return (data as InterviewAnswerRow[]).map((row) => interviewAnswerSchema.parse({
      id: row.id,
      customerId: row.customer_id,
      onboardingSessionId: row.onboarding_session_id,
      questionKey: row.question_key,
      answerJson: row.answer_json,
      normalizedFacts: row.normalized_facts,
      answerStatus: row.answer_status,
      isLatest: row.is_latest,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
