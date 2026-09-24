export type SystemDraftBlueprint = {
  business?: { summary?: string; vertical?: string; operationalFocus?: string };
  entities?: { key?: string; label?: string; description?: string; fields?: { key?: string; label?: string; type?: string; required?: boolean; referenceEntity?: string }[] }[];
  relationships?: { fromEntity?: string; toEntity?: string; relationshipType?: string; label?: string }[];
  workflows?: { key?: string; name?: string; description?: string; trigger?: string; steps?: { key?: string; type?: string; description?: string; entity?: string }[] }[];
  roles?: { key?: string; name?: string; description?: string; permissions?: { action?: string; entity?: string; field?: string }[] }[];
  views?: { key?: string; name?: string; entity?: string; type?: string }[];
  automations?: { key?: string; trigger?: string; actions?: string[]; conditions?: string[] }[];
  integrations?: { key?: string; provider?: string; capability?: string; purpose?: string }[];
  reports?: { key?: string; name?: string; description?: string; sourceEntity?: string }[];
  agent?: { name?: string; mission?: string; responsibilities?: string[]; guardrails?: string[] };
};

export type DraftResponse = {
  draft?: {
    id?: string;
    version?: number;
    status?: "draft" | "in_review" | "approved" | "rejected" | "archived";
    blueprint?: SystemDraftBlueprint;
  };
  blueprint?: SystemDraftBlueprint;
  error?: { message?: string };
};

export function getCreatedDraft(response: DraftResponse) {
  if (!response.draft?.id || !response.blueprint) return null;
  return {
    id: response.draft.id,
    version: response.draft.version ?? 1,
    status: response.draft.status ?? "draft",
    blueprint: response.blueprint,
  };
}

export function canStartDraft(sessionId: string | null, draftBuilding: boolean) {
  return Boolean(sessionId) && !draftBuilding;
}