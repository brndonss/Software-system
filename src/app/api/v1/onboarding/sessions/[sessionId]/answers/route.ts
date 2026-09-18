import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { defaultInterviewCatalog } from "@/lib/ai/interview-catalog";
import {
  answerInputSchema,
  interviewAnswerSchema,
  saveAnswerResponseSchema,
  sessionIdParamSchema,
  type JsonValue,
  type InterviewAnswer,
  type InterviewSession,
} from "@/lib/ai/interview-contracts";

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

type AnswerRow = {
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
};

function serializeAnswer(row: AnswerRow): InterviewAnswer {
  return interviewAnswerSchema.parse({
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
  });
}

function buildNormalizedFacts(questionKey: string, answer: JsonValue): Record<string, JsonValue> {
  const segments = questionKey.split(".").filter(Boolean);
  if (!segments.length) return {};

  const root: Record<string, JsonValue> = {};
  let current = root;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = answer;
      return;
    }
    const nested: Record<string, JsonValue> = {};
    current[segment] = nested;
    current = nested;
  });
  return root;
}

function errorResponse(message: string, code: string, error: { code?: string } | null) {
  return jsonError(message, error?.code === "42501" ? 403 : 500, error?.code === "42501" ? "forbidden" : code);
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

  const parsed = answerInputSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide a valid answer", 422, "invalid_answer");
  if (!defaultInterviewCatalog.questions.some((question) => question.key === parsed.data.questionKey)) {
    return jsonError("Please provide a valid interview question", 422, "invalid_question");
  }

  const { data: session, error: sessionError } = await resolved.supabase
    .from("onboarding_sessions")
    .select("id, customer_id, workspace_id, status, version, started_at, completed_at, last_question_key, created_by, created_at, updated_at, metadata")
    .eq("id", parsedParams.data.sessionId)
    .eq("customer_id", resolved.customerId)
    .maybeSingle();

  if (sessionError) return errorResponse("Unable to load onboarding session", "session_fetch_failed", sessionError);
  if (!session) return jsonError("Onboarding session not found", 404, "session_not_found");
  if (["completed", "abandoned"].includes((session as SessionRow).status)) {
    return jsonError("This onboarding session cannot accept answers", 409, "session_not_writable");
  }

  const { data: answer, error: answerError } = await resolved.supabase.rpc("save_onboarding_answer", {
    p_session_id: parsedParams.data.sessionId,
    p_customer_id: resolved.customerId,
    p_question_key: parsed.data.questionKey,
    p_answer_json: { value: parsed.data.answer, metadata: parsed.data.metadata },
    p_normalized_facts: buildNormalizedFacts(parsed.data.questionKey, parsed.data.answer),
  });

  if (answerError || !answer) {
    if (answerError?.code === "P0002") return jsonError("Onboarding session not found", 404, "session_not_found");
    if (answerError?.code === "P0003") return jsonError("This onboarding session cannot accept answers", 409, "session_not_writable");
    return errorResponse("Unable to save answer", "answer_create_failed", answerError);
  }

  const answerRow = Array.isArray(answer) ? answer[0] : answer;
  return NextResponse.json(saveAnswerResponseSchema.parse({ answer: serializeAnswer(answerRow as AnswerRow) }), { status: 201 });
}
