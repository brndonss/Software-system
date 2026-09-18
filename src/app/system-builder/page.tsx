"use client";

import { useState } from "react";

const starterPrompts = [
  "📦 Manage a 3-location logistics warehouse with automatic stock-in checking",
  "🎯 Automate inbound marketing agency lead tracking and team assignment",
  "🏗️ Run construction projects with crews, schedules, materials and inspections",
];

type BlueprintDraft = {
  id: string;
  status: string;
  blueprint: Record<string, unknown>;
};

export default function SystemBuilderPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessSummary, setBusinessSummary] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BlueprintDraft | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("Describe the workflow or operations you want Northstar to understand.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsProcessing(true);
    setBusinessSummary(null);

    try {
      const response = await fetch("/api/v1/system-builder/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDescription: prompt }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error?.message ?? `Request failed with status ${response.status}.`);
      }

      setDraft(data?.draft ?? { id: "draft", status: "draft", blueprint: data?.blueprint ?? {} });
      setBusinessSummary(data?.blueprint ?? null);
      setIsProcessing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate the blueprint.");
    } finally {
      setLoading(false);
      setTimeout(() => setIsProcessing(false), 900);
    }
  }

  const blueprint = (draft?.blueprint ?? businessSummary ?? {}) as Record<string, unknown>;
  const business = (blueprint.business as Record<string, unknown>) ?? {};
  const entities = Array.isArray(blueprint.entities) ? blueprint.entities as Record<string, unknown>[] : [];
  const workflows = Array.isArray(blueprint.workflows) ? blueprint.workflows as Record<string, unknown>[] : [];
  const roles = Array.isArray(blueprint.roles) ? blueprint.roles as Record<string, unknown>[] : [];
  const views = Array.isArray(blueprint.views) ? blueprint.views as Record<string, unknown>[] : [];
  const assumptions = Array.isArray(blueprint.assumptions) ? blueprint.assumptions as string[] : [];
  const clarificationNeeded = Array.isArray(blueprint.clarificationNeeded) ? blueprint.clarificationNeeded as string[] : [];

  return (
    <main className="onboarding-v2" style={{ minHeight: "100vh" }}>
      <div className="onboarding-v2-shell">
        <aside className="onboarding-v2-aside">
          <button className="onboarding-v2-brand" type="button" onClick={() => window.location.href = "/"}><span>N</span><b>NORTHSTAR</b></button>
          <div className="onboarding-v2-aside-copy">
            <p className="onboarding-v2-kicker">Command canvas</p>
            <h1>What are we building?</h1>
            <p>Describe the business workflow and Northstar will translate it into a structured operating blueprint.</p>
          </div>
          <div className="onboarding-v2-steps">
            <div className="onboarding-v2-step"><span>01</span><div><b>Understand</b><small>business context and operations</small></div></div>
            <div className="onboarding-v2-step"><span>02</span><div><b>Map</b><small>entities, roles, and workflows</small></div></div>
            <div className="onboarding-v2-step"><span>03</span><div><b>Review</b><small>validated blueprint and draft</small></div></div>
          </div>
        </aside>

        <section className="onboarding-v2-content">
          <header className="onboarding-v2-header">
            <span>{isProcessing ? "BUILDING" : "READY"}</span>
            <button type="button" onClick={() => window.location.href = "/dashboard"}>Back to workspace</button>
          </header>

          <div className="onboarding-v2-form-wrap">
            <div className="onboarding-v2-intro">
              <p className="onboarding-v2-kicker">AI system builder</p>
              <h2>Describe your workflow or operations...</h2>
            </div>

            <form onSubmit={handleSubmit} className="onboarding-v2-form" style={{ marginTop: 32 }}>
              <textarea
                aria-label="Business description"
                className="onboarding-v2-answer-control"
                rows={6}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="We run a 3-location logistics warehouse and want to track incoming inventory, shipments, discrepancies, suppliers, and automatically alert the team when received quantities don't match expected quantities."
              />

              <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                {starterPrompts.map((example) => (
                  <button key={example} type="button" className="outline-button" style={{ width: "fit-content", maxWidth: "100%", textAlign: "left", background: "rgba(255,255,255,0.02)" }} onClick={() => setPrompt(example)}>
                    {example}
                  </button>
                ))}
              </div>

              {error ? <p className="onboarding-v2-error">{error}</p> : null}

              <div className="onboarding-v2-actions" style={{ paddingTop: 26 }}>
                <span>{loading ? "Understanding your business..." : "Northstar can design a business-specific software system."}</span>
                <button type="submit" className="onboarding-v2-submit" disabled={loading}>
                  {loading ? "Generating..." : "Review system"} <b>→</b>
                </button>
              </div>
            </form>

            {isProcessing ? (
              <div className="onboarding-v2-completion" style={{ marginTop: 32 }}>
                <p className="onboarding-v2-kicker">Building</p>
                <h2>Understanding your business</h2>
                <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
                  <div className="onboarding-v2-completion-note">Mapping operational entities</div>
                  <div className="onboarding-v2-completion-note">Designing workflows</div>
                  <div className="onboarding-v2-completion-note">Preparing your AI agent</div>
                </div>
              </div>
            ) : null}

            {business.summary || entities.length || workflows.length ? (
              <div className="onboarding-v2-history" style={{ marginTop: 32 }}>
                <article className="onboarding-v2-message">
                  <span className="onboarding-v2-message-label">Business understanding</span>
                  <p className="onboarding-v2-message-question">Business summary</p>
                  <p className="onboarding-v2-message-answer">{String(business.summary ?? "Business summary unavailable")}</p>
                </article>

                <article className="onboarding-v2-message">
                  <span className="onboarding-v2-message-label">System structure</span>
                  <p className="onboarding-v2-message-question">Entities</p>
                  <p className="onboarding-v2-message-answer">{entities.map((entity) => String(entity.label ?? entity.key)).join(" • ") || "No entities mapped yet"}</p>
                </article>

                <article className="onboarding-v2-message">
                  <span className="onboarding-v2-message-label">Operations</span>
                  <p className="onboarding-v2-message-question">Workflows</p>
                  <p className="onboarding-v2-message-answer">{workflows.map((workflow) => String(workflow.name ?? workflow.key)).join(" • ") || "No workflows mapped yet"}</p>
                </article>

                <article className="onboarding-v2-message">
                  <span className="onboarding-v2-message-label">Team</span>
                  <p className="onboarding-v2-message-question">Roles</p>
                  <p className="onboarding-v2-message-answer">{roles.map((role) => String(role.name ?? role.key)).join(" • ") || "No roles mapped yet"}</p>
                </article>

                <article className="onboarding-v2-message">
                  <span className="onboarding-v2-message-label">Workspace</span>
                  <p className="onboarding-v2-message-question">Views</p>
                  <p className="onboarding-v2-message-answer">{views.map((view) => String(view.name ?? view.key)).join(" • ") || "No views mapped yet"}</p>
                </article>

                {draft ? <article className="onboarding-v2-message"><span className="onboarding-v2-message-label">Draft</span><p className="onboarding-v2-message-question">Saved as draft blueprint</p><p className="onboarding-v2-message-answer">Status: {String(draft.status ?? "draft")}</p></article> : null}

                {assumptions.length ? (
                  <article className="onboarding-v2-message">
                    <span className="onboarding-v2-message-label">Assumptions</span>
                    <p className="onboarding-v2-message-answer">{assumptions.join("\n")}</p>
                  </article>
                ) : null}

                {clarificationNeeded.length ? (
                  <article className="onboarding-v2-message">
                    <span className="onboarding-v2-message-label">Clarifications</span>
                    <p className="onboarding-v2-message-answer">{clarificationNeeded.join("\n")}</p>
                  </article>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
