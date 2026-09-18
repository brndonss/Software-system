import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import {
  completeSessionRequestSchema,
  completeSessionResponseSchema,
  interviewSessionSchema,
  normalizeInterviewTimestamp,
  sessionIdParamSchema,
  type InterviewSession,
} from "@/lib/ai/interview-contracts";
import { InterviewEngine } from "@/lib/ai/interview-engine";
import {
  InterviewScopeError,
  InterviewSessionNotFoundError,
} from "@/lib/ai/interview-repository";
import { SupabaseInterviewRepository } from "@/lib/ai/interview-supabase-repository";

const sessionSelect = "id, customer_id, workspace_id, status, version, started_at, completed_at, last_question_key, created_by, created_at, updated_at, metadata";

type SessionRow = {
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
};

function serializeSession(row: SessionRow): InterviewSession {
  return interviewSessionSchema.parse({
    id: row.id,
    customerId: row.customer_id,
    workspaceId: row.workspace_id,
    status: row.status,
    version: row.version,
    startedAt: normalizeInterviewTimestamp(row.started_at),
    completedAt: row.completed_at ? normalizeInterviewTimestamp(row.completed_at) : null,
    lastQuestionKey: row.last_question_key,
    createdBy: row.created_by,
    createdAt: normalizeInterviewTimestamp(row.created_at),
    updatedAt: normalizeInterviewTimestamp(row.updated_at),
    metadata: row.metadata,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const parsedParams = sessionIdParamSchema.safeParse(await params);
  if (!parsedParams.success) return jsonError("Invalid session ID", 422, "invalid_session_id");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400, "invalid_payload");
  }

  const parsedBody = completeSessionRequestSchema.safeParse(body);
  if (!parsedBody.success) return jsonError("Please provide valid completion data", 422, "invalid_completion");

  try {
    const repository = new SupabaseInterviewRepository(resolved.supabase);
    const engine = new InterviewEngine(repository);
    const state = await engine.evaluate({
      sessionId: parsedParams.data.sessionId,
      authenticatedCustomerId: resolved.customerId,
    });

    if (["completed", "abandoned"].includes(state.session.status)) {
      return jsonError("This onboarding session cannot be completed", 409, "session_not_writable");
    }
    if (state.completion.status !== "complete") {
      return jsonError(
        state.completion.status === "blocked" ? "This onboarding session is blocked" : "This onboarding session is not ready for completion",
        409,
        state.completion.status === "blocked" ? "onboarding_blocked" : "onboarding_incomplete",
      );
    }

    const metadata = { ...state.session.metadata };
    if (parsedBody.data.notes !== undefined) metadata.completionNotes = parsedBody.data.notes;

    const { data, error } = await resolved.supabase
      .from("onboarding_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        metadata,
      })
      .eq("id", state.session.id)
      .eq("customer_id", resolved.customerId)
      .in("status", ["in_progress", "awaiting_input"])
      .select(sessionSelect)
      .single();

    if (error || !data) return jsonError("Unable to complete onboarding session", error?.code === "42501" ? 403 : 500, error?.code === "42501" ? "forbidden" : "session_complete_failed");

    return NextResponse.json(completeSessionResponseSchema.parse({
      session: serializeSession(data as SessionRow),
      completion: state.completion,
    }));
  } catch (error) {
    if (error instanceof InterviewSessionNotFoundError) return jsonError("Onboarding session not found", 404, "session_not_found");
    if (error instanceof InterviewScopeError) return jsonError("You cannot access this onboarding session", 403, "forbidden");
    return jsonError("Unable to complete onboarding session", 500, "session_complete_failed");
  }
}
