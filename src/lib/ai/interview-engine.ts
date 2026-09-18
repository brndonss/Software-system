import {
  getCompletionThresholdConfig,
  type CompletionThresholdConfig,
} from "@/lib/ai/completion-config";
import {
  normalizedBusinessFactsSchema,
  type CompletionResult,
  type InterviewAnswer,
  type InterviewQuestion,
  type InterviewSession,
  type NextQuestionDecision,
  type NextQuestionResponse,
  type NormalizedBusinessFacts,
} from "@/lib/ai/interview-contracts";
import { defaultInterviewCatalog, type InterviewCatalog } from "@/lib/ai/interview-catalog";
import { evaluateCompletion } from "@/lib/ai/interview-completion";
import { mergeAnswerFacts } from "@/lib/ai/interview-facts";
import { getRelevantDomains } from "@/lib/ai/interview-relevance";
import { selectNextQuestion } from "@/lib/ai/interview-question-selector";
import {
  InterviewScopeError,
  InterviewSessionNotFoundError,
  type InterviewRepository,
} from "@/lib/ai/interview-repository";

export interface InterviewEngineInput {
  sessionId: string;
  authenticatedCustomerId: string;
  catalog?: InterviewCatalog;
  completionConfig?: Partial<CompletionThresholdConfig>;
}

export interface InterviewEngineState {
  session: InterviewSession;
  answers: InterviewAnswer[];
  facts: NormalizedBusinessFacts;
  relevantDomainKeys: string[];
  nextQuestion: InterviewQuestion | null;
  decision: NextQuestionDecision | null;
  completion: CompletionResult;
}

export class InterviewEngine {
  constructor(
    private readonly repository: InterviewRepository,
    private readonly defaultCatalog: InterviewCatalog = defaultInterviewCatalog,
  ) {}

  async evaluate(input: InterviewEngineInput): Promise<InterviewEngineState> {
    const session = await this.repository.getSession(input.sessionId, input.authenticatedCustomerId);
    if (!session) throw new InterviewSessionNotFoundError(input.sessionId);
    if (session.customerId !== input.authenticatedCustomerId) {
      throw new InterviewScopeError("Interview session does not belong to the authenticated customer");
    }

    const answers = await this.repository.listLatestAnswers(
      session.id,
      session.customerId,
    );
    const facts = normalizedBusinessFactsSchema.parse(mergeAnswerFacts(answers));
    const catalog = input.catalog ?? this.defaultCatalog;
    const completionConfig = getCompletionThresholdConfig(input.completionConfig);
    const relevantDomains = getRelevantDomains(facts, catalog.domains);
    const selection = selectNextQuestion(
      catalog.questions,
      catalog.domains,
      relevantDomains,
      facts,
      answers,
    );
    const completion = evaluateCompletion({
      facts,
      relevantDomains,
      config: completionConfig,
      hasNextQuestion: selection.question !== null,
    });

    return {
      session,
      answers,
      facts,
      relevantDomainKeys: relevantDomains.map((domain) => domain.key),
      nextQuestion: completion.status === "complete" ? null : selection.question,
      decision: completion.status === "complete" ? null : selection.decision,
      completion: {
        ...completion,
        nextQuestionKey: completion.status === "complete" ? null : selection.question?.key ?? null,
      },
    };
  }

  async getNextQuestion(input: InterviewEngineInput): Promise<NextQuestionResponse> {
    const state = await this.evaluate(input);
    return {
      question: state.nextQuestion,
      status: state.completion.status === "complete" ? "complete" : state.completion.status === "blocked" ? "blocked" : "ready",
      decision: state.decision,
    };
  }
}
