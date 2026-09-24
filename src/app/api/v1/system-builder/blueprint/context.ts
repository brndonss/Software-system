type SessionAnswer = { question_key: string; answer_json: unknown; normalized_facts: unknown };

type ContextInput = {
  sessionId?: string;
  onboardingData: Record<string, unknown> | null;
  onboardingSessions: unknown[];
  sessionAnswers: SessionAnswer[];
};

export function buildBlueprintGenerationContext(input: ContextInput) {
  const sessionScoped = Boolean(input.sessionId);
  const onboardingData = input.onboardingData ?? {};

  return {
    ...(sessionScoped ? {} : {
      business_niche: onboardingData.business_niche ?? null,
      business_size: onboardingData.business_size ?? null,
      services_products: onboardingData.services_products ?? null,
      current_software_tools: onboardingData.current_software_tools ?? null,
      biggest_business_struggles: onboardingData.biggest_business_struggles ?? null,
      repetitive_tasks: onboardingData.repetitive_tasks ?? null,
      desired_automations: onboardingData.desired_automations ?? null,
      software_goals: onboardingData.software_goals ?? null,
      additional_information: onboardingData.additional_information ?? null,
    }),
    onboarding_sessions: sessionScoped ? [{ id: input.sessionId }] : input.onboardingSessions,
    onboarding_answers: input.sessionAnswers,
  };
}