import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import {
  getSessionResponseSchema,
  interviewSessionSchema,
  sessionIdParamSchema,
  type InterviewSession,
} from "@/lib/ai/interview-contracts";

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
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastQuestionKey: row.last_question_key,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const parsedParams = sessionIdParamSchema.safeParse(await params);
  if (!parsedParams.success) return jsonError("Invalid session ID", 422, "invalid_session_id");

  const { data, error } = await resolved.supabase
    .from("onboarding_sessions")
    .select(sessionSelect)
    .eq("id", parsedParams.data.sessionId)
    .eq("customer_id", resolved.customerId)
    .maybeSingle();

  if (error) return jsonError("Unable to load onboarding session", error.code === "42501" ? 403 : 500, error.code === "42501" ? "forbidden" : "session_fetch_failed");
  if (!data) return jsonError("Onboarding session not found", 404, "session_not_found");

  return NextResponse.json(getSessionResponseSchema.parse({ session: serializeSession(data as SessionRow) }));
}
