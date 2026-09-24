import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { InterviewEngine } from "@/lib/ai/interview-engine";
import { SupabaseInterviewRepository } from "@/lib/ai/interview-supabase-repository";
import { defaultInterviewCatalog } from "@/lib/ai/interview-catalog";
import {
  jsonObjectSchema,
  normalizedBusinessFactsSchema,
  type JsonValue,
  sessionIdParamSchema,
} from "@/lib/ai/interview-contracts";
import { mergeFactObjects } from "@/lib/ai/interview-facts";
import {
  generateConversationResponse,
  normalizeConversationFacts,
  validateConversationResponse,
} from "@/lib/ai/conversation";

const conversationRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  questionKey: z.string().min(1).max(200),
}).strict();

function buildFallbackFacts(questionKey: string, message: string) {
  const segments = questionKey.split(".").filter(Boolean);
  const root: Record<string, unknown> = {};
  let current = root;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = message;
      return;
    }
    const nested: Record<string, unknown> = {};
    current[segment] = nested;
    current = nested;
  });
  return jsonObjectSchema.parse(root);
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

  const parsedBody = conversationRequestSchema.safeParse(body);
  if (!parsedBody.success) return jsonError("Please provide a natural-language response", 422, "invalid_conversation_message");

  const question = defaultInterviewCatalog.questions.find((item) => item.key === parsedBody.data.questionKey);
  if (!question) return jsonError("The requested conversation step is not supported", 422, "invalid_question");

  try {
    const repository = new SupabaseInterviewRepository(resolved.supabase);
    const session = await repository.getSession(parsedParams.data.sessionId, resolved.customerId);
    if (!session) return jsonError("Onboarding session not found", 404, "session_not_found");
    if (["completed", "abandoned"].includes(session.status)) return jsonError("This onboarding session cannot accept answers", 409, "session_not_writable");

    const answers = await repository.listLatestAnswers(session.id, resolved.customerId);
    const knownFacts = normalizedBusinessFactsSchema.parse(
      answers.reduce<JsonValue>((facts, answer) => mergeFactObjects(facts, answer.normalizedFacts), {}),
    );
    const response = await generateConversationResponse({
      message: parsedBody.data.message,
      currentQuestionKey: question.key,
      knownFacts,
      answeredQuestionKeys: answers.map((answer) => answer.questionKey),
      conversationHistory: answers.map((answer) => ({
        questionKey: answer.questionKey,
        prompt: defaultInterviewCatalog.questions.find((item) => item.key === answer.questionKey)?.prompt,
        answer: typeof (answer.answerJson as { value?: unknown })?.value === "string"
          ? String((answer.answerJson as { value: string }).value)
          : JSON.stringify(answer.answerJson),
      })),
    });
    const extractedFacts = normalizeConversationFacts(
      knownFacts,
      jsonObjectSchema.parse(mergeFactObjects(
        buildFallbackFacts(question.key, parsedBody.data.message),
        response.facts,
      )),
    );

    const { data: savedAnswer, error: saveError } = await resolved.supabase.rpc("save_onboarding_answer", {
      p_session_id: session.id,
      p_customer_id: resolved.customerId,
      p_question_key: question.key,
      p_answer_json: { value: parsedBody.data.message, metadata: { source: "command_canvas_conversation" } },
      p_normalized_facts: extractedFacts,
    });
    if (saveError || !savedAnswer) {
      if (saveError?.code === "P0003") return jsonError("This onboarding session cannot accept answers", 409, "session_not_writable");
      return jsonError("Unable to save your business understanding", 500, "answer_create_failed");
    }

    const state = await new InterviewEngine(repository).evaluate({
      sessionId: session.id,
      authenticatedCustomerId: resolved.customerId,
    });
    const validatedResponse = validateConversationResponse(response, {
      message: parsedBody.data.message,
      currentQuestionKey: question.key,
      knownFacts: state.facts,
      answeredQuestionKeys: state.answers.map((answer) => answer.questionKey),
      conversationHistory: state.answers.map((answer) => ({
        questionKey: answer.questionKey,
        prompt: defaultInterviewCatalog.questions.find((item) => item.key === answer.questionKey)?.prompt,
        answer: typeof (answer.answerJson as { value?: unknown })?.value === "string"
          ? String((answer.answerJson as { value: string }).value)
          : JSON.stringify(answer.answerJson),
      })),
    });
    const nextQuestion = state.completion.status === "complete"
      ? null
      : validatedResponse.nextQuestion ?? (state.nextQuestion
        ? { questionKey: state.nextQuestion.key, prompt: state.nextQuestion.prompt }
        : null);

    return NextResponse.json({
      message: response.message,
      facts: extractedFacts,
      confidence: response.confidence,
      needsClarification: response.needsClarification,
      nextQuestion,
      completion: state.completion,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Northstar could not validate that understanding", 422, "invalid_conversation_output");
    return jsonError("Northstar could not continue the conversation", 500, "conversation_failed");
  }
}
