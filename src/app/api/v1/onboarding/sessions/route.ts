import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import {
  createSessionRequestSchema,
  createSessionResponseSchema,
  interviewSessionSchema,
  listSessionsResponseSchema,
  normalizeInterviewTimestamp,
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
    startedAt: normalizeInterviewTimestamp(row.started_at),
    completedAt: row.completed_at ? normalizeInterviewTimestamp(row.completed_at) : null,
    lastQuestionKey: row.last_question_key,
    createdBy: row.created_by,
    createdAt: normalizeInterviewTimestamp(row.created_at),
    updatedAt: normalizeInterviewTimestamp(row.updated_at),
    metadata: row.metadata,
  });
}

function databaseError(message: string, code: string, error: { code?: string } | null) {
  return jsonError(message, error?.code === "42501" ? 403 : 500, error?.code === "42501" ? "forbidden" : code);
}

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase
    .from("onboarding_sessions")
    .select(sessionSelect)
    .eq("customer_id", resolved.customerId)
    .order("started_at", { ascending: false });

  if (error) {
    return databaseError("Unable to load onboarding sessions", "sessions_fetch_failed", error);
  }

  const response = listSessionsResponseSchema.parse({
    sessions: ((data ?? []) as SessionRow[]).map(serializeSession),
  });
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400, "invalid_payload");
  }

  const parsed = createSessionRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid session data", 422, "invalid_session");

  if (parsed.data.workspaceId) {
    const { data: workspace, error: workspaceError } = await resolved.supabase
      .from("workspaces")
      .select("id")
      .eq("id", parsed.data.workspaceId)
      .eq("customer_id", resolved.customerId)
      .maybeSingle();

    if (workspaceError) return databaseError("Unable to validate workspace", "workspace_validation_failed", workspaceError);
    if (!workspace) return jsonError("Workspace not found or not owned by this customer", 403, "workspace_forbidden");
  }

  const { data, error } = await resolved.supabase
    .from("onboarding_sessions")
    .insert({
      customer_id: resolved.customerId,
      workspace_id: parsed.data.workspaceId,
      status: "in_progress",
      version: 1,
      created_by: resolved.user.id,
      metadata: parsed.data.metadata,
    })
    .select(sessionSelect)
    .single();

  if (error || !data) return databaseError("Unable to create onboarding session", "session_create_failed", error);

  const response = createSessionResponseSchema.parse({ session: serializeSession(data as SessionRow) });
  return NextResponse.json(response, { status: 201 });
}
