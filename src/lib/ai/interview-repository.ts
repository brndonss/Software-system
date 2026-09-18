import type { InterviewAnswer, InterviewSession } from "@/lib/ai/interview-contracts";

export interface InterviewRepository {
  getSession(sessionId: string, customerId: string): Promise<InterviewSession | null>;
  listLatestAnswers(sessionId: string, customerId: string): Promise<InterviewAnswer[]>;
}

export class InterviewSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Interview session not found: ${sessionId}`);
    this.name = "InterviewSessionNotFoundError";
  }
}

export class InterviewScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewScopeError";
  }
}
