import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import {
  nextQuestionResponseSchema,
  sessionIdParamSchema,
} from "@/lib/ai/interview-contracts";
import { InterviewEngine } from "@/lib/ai/interview-engine";
import {
  InterviewScopeError,
  InterviewSessionNotFoundError,
} from "@/lib/ai/interview-repository";
import { SupabaseInterviewRepository } from "@/lib/ai/interview-supabase-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const parsedParams = sessionIdParamSchema.safeParse(await params);
  if (!parsedParams.success) return jsonError("Invalid session ID", 422, "invalid_session_id");

  try {
    const repository = new SupabaseInterviewRepository(resolved.supabase);
    const response = await new InterviewEngine(repository).getNextQuestion({
      sessionId: parsedParams.data.sessionId,
      authenticatedCustomerId: resolved.customerId,
    });
    return NextResponse.json(nextQuestionResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof InterviewSessionNotFoundError) return jsonError("Onboarding session not found", 404, "session_not_found");
    if (error instanceof InterviewScopeError) return jsonError("You cannot access this onboarding session", 403, "forbidden");
    return jsonError("Unable to determine the next onboarding question", 500, "next_question_failed");
  }
}
