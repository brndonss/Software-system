"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { buildBlueprintRequest } from "@/app/components/command-canvas-contract";
import { canStartDraft, getCreatedDraft, type DraftResponse, type SystemDraftBlueprint } from "@/app/components/command-canvas-draft";

type Session = { id: string; status: "in_progress" | "awaiting_input" | "completed" | "abandoned" };
type Question = { key: string; prompt: string };
type Turn = { question: Question; answer: string };
type Blueprint = SystemDraftBlueprint;
type ConversationResult = { message: string; facts?: Record<string, unknown>; nextQuestion: { questionKey: string; prompt: string } | null; error?: { message?: string } };
type DraftStatus = "draft" | "in_review" | "approved" | "rejected" | "archived";

function conversationStorageKey(sessionId: string) {
  return `command-canvas:v2:${sessionId}`;
}

const examples = [
  "Run my landscaping business",
  "Track the work my team handles every day",
  "Build a system around our customer operations",
  "Manage projects, crews, and clients",
];

export default function CommandCanvas() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [draftBuilding, setDraftBuilding] = useState(false);
  const [error, setError] = useState("");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(1);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("draft");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [systemView, setSystemView] = useState(false);
  const [expandedSystemCard, setExpandedSystemCard] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisioningStatus, setProvisioningStatus] = useState("idle");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [learnedFacts, setLearnedFacts] = useState<Record<string, unknown>>({});
  const draftSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void initialize();
    // Initialization is intentionally run once for the authenticated session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initialize() {
    try {
      const response = await fetch("/api/v1/onboarding/sessions");
      if (response.status === 401) { router.push("/"); return; }
      if (!response.ok) throw new Error("Unable to load your Northstar session.");
      const data = await response.json() as { sessions: Session[] };
      let active = data.sessions.find((item) => item.status === "in_progress" || item.status === "awaiting_input");
      let createdNewSession = false;
      if (!active) {
        const created = await fetch("/api/v1/onboarding/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: null, metadata: { experience: "command_canvas" } }) });
        if (!created.ok) throw new Error("Unable to start your Northstar session.");
        active = (await created.json() as { session: Session }).session;
        createdNewSession = true;
      }
      setSession(active);
      const saved = sessionStorage.getItem(conversationStorageKey(active.id));
      if (saved) setTurns(JSON.parse(saved) as Turn[]);
      const savedDraftResponse = await fetch(`/api/v1/system-builder/blueprint?sessionId=${encodeURIComponent(active.id)}`);
      if (savedDraftResponse.ok) {
        const savedDraft = await savedDraftResponse.json() as DraftResponse & { draft?: DraftResponse["draft"] };
        const existingDraft = getCreatedDraft(savedDraft);
        if (existingDraft) {
          setDraftId(existingDraft.id);
          setDraftVersion(existingDraft.version);
          setDraftStatus(existingDraft.status);
          setBlueprint(existingDraft.blueprint);
          setSystemView(true);
          setQuestion(null);
          setSession((current) => current ? { ...current, status: "completed" } : current);
          return;
        }
      }
      if (createdNewSession) {
        const firstQuestion = { key: "business.description", prompt: "Tell Northstar what your business does and what you need the system to handle." };
        setQuestion(firstQuestion);
        setAssistantMessage("Start wherever feels natural. I'll listen for how the business works.");
      } else {
        await loadQuestion(active.id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start Northstar.");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestion(sessionId: string) {
    const response = await fetch(`/api/v1/onboarding/sessions/${sessionId}/next-question`);
    if (!response.ok) throw new Error("Northstar could not choose the next step.");
    const result = await response.json() as { question: Question | null; status: "ready" | "complete" | "blocked" };
    if (result.status === "complete") {
      setQuestion(null);
      setAssistantMessage("Northstar has enough context to prepare a first system draft.");
      setSession((current) => current ? { ...current, status: "completed" } : current);
      return;
    }
    if (result.status === "blocked" || !result.question) throw new Error("Northstar needs a little more context before continuing.");
    setQuestion({ key: result.question.key, prompt: result.question.prompt });
    setAssistantMessage("Let's keep mapping how the work moves through your business. What should Northstar understand next?");
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !question || !message.trim() || thinking) return;
    const answer = message.trim();
    setThinking(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/system-builder/conversation?sessionId=${encodeURIComponent(session.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionKey: question.key, message: answer }) });
      const data = await response.json() as ConversationResult;
      if (!response.ok) throw new Error(data.error?.message ?? "Northstar could not save that response. Try again.");
      const nextTurns = [...turns, { question, answer }];
      setTurns(nextTurns);
      sessionStorage.setItem(conversationStorageKey(session.id), JSON.stringify(nextTurns));
      setMessage("");
      if (data.facts) setLearnedFacts(data.facts);
      setAssistantMessage(data.nextQuestion ? `${data.message} ${data.nextQuestion.prompt}` : data.message);
      setQuestion(data.nextQuestion ? { key: data.nextQuestion.questionKey, prompt: data.nextQuestion.prompt } : null);
      if (!data.nextQuestion) setSession((current) => current ? { ...current, status: "completed" } : current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Northstar could not process that response.");
    } finally {
      setThinking(false);
    }
  }

  async function createBlueprint() {
    const sessionId = session?.id ?? null;
    if (!sessionId || !canStartDraft(sessionId, draftBuilding)) return;
    setDraftBuilding(true);
    setError("");
    try {
      const response = await fetch("/api/v1/system-builder/blueprint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBlueprintRequest(sessionId)) });
      const data = await response.json() as DraftResponse;
      const createdDraft = getCreatedDraft(data);
      if (!response.ok || !createdDraft) throw new Error(data.error?.message ?? "Northstar could not prepare the system draft.");
      setDraftId(createdDraft.id);
      setDraftVersion(createdDraft.version);
      setDraftStatus(createdDraft.status);
      setBlueprint(createdDraft.blueprint);
      sessionStorage.setItem(`command-canvas:draft:${sessionId}`, JSON.stringify({ id: createdDraft.id, version: createdDraft.version, status: createdDraft.status }));
      setSystemView(true);
      requestAnimationFrame(() => draftSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Northstar could not prepare the system draft.");
    } finally {
      setDraftBuilding(false);
    }
  }

  async function transitionDraft(action: "submit" | "approve") {
    if (!draftId || reviewBusy || draftStatus === "approved") return;
    setReviewBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/system-builder/blueprint/${draftId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: draftVersion }),
      });
      const data = await response.json() as { blueprint?: { version?: number; status?: DraftStatus }; error?: { message?: string } };
      if (!response.ok || !data.blueprint?.status) throw new Error(data.error?.message ?? "Northstar could not update this draft.");
      setDraftVersion(data.blueprint.version ?? draftVersion);
      setDraftStatus(data.blueprint.status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Northstar could not update this draft.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function buildApprovedSystem() {
    if (!draftId || draftStatus !== "approved" || provisioning) return;
    setProvisioning(true);
    setProvisioningStatus("queued");
    setError("");
    try {
      const response = await fetch(`/api/v1/system-builder/blueprint/${draftId}/provision`, { method: "POST" });
      const data = await response.json() as { deployment?: { id: string; state: string }; error?: { message?: string } };
      if (!response.ok || !data.deployment) throw new Error(data.error?.message ?? "Northstar could not start provisioning.");
      await pollProvisioning(draftId);
    } catch (caught) {
      setProvisioning(false);
      setProvisioningStatus("failed");
      setError(caught instanceof Error ? caught.message : "Northstar could not build the system.");
    }
  }

  async function pollProvisioning(blueprintId: string): Promise<void> {
    const response = await fetch(`/api/v1/system-builder/blueprint/${blueprintId}/provision`);
    const data = await response.json() as { deployment?: { id: string; state: string; error_message?: string }; job?: { state?: string; last_error_message?: string }; error?: { message?: string } };
    if (!response.ok || !data.deployment) throw new Error(data.error?.message ?? "Unable to read provisioning status.");
    setProvisioningStatus(data.deployment.state);
    if (data.deployment.state === "failed") throw new Error(data.deployment.error_message ?? data.job?.last_error_message ?? "Provisioning failed.");
    if (data.deployment.state !== "ready") {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));
      return pollProvisioning(blueprintId);
    }
    setProvisioningStatus("activating");
    const activation = await fetch(`/api/v1/runtime/deployments/${data.deployment.id}/activate`, { method: "POST" });
    const activationData = await activation.json() as { error?: { message?: string } };
    if (!activation.ok) throw new Error(activationData.error?.message ?? "Provisioning completed but activation failed.");
    router.push("/dashboard");
  }

  const factChips = useMemo(() => getFactChips(learnedFacts), [learnedFacts]);

  if (loading) return <main className="command-canvas command-canvas-loading"><span className="command-canvas-mark">N</span><p>Preparing your command canvas</p></main>;

  if (blueprint && systemView) return <SystemExperience
    blueprint={blueprint}
    draftStatus={draftStatus}
    draftId={draftId}
    reviewBusy={reviewBusy}
    expandedCard={expandedSystemCard}
    onExpand={setExpandedSystemCard}
    onBack={() => setSystemView(false)}
    onSubmit={() => void transitionDraft("submit")}
    onApprove={() => void transitionDraft("approve")}
    onBuild={() => void buildApprovedSystem()}
    provisioning={provisioning}
    provisioningStatus={provisioningStatus}
    error={error}
  />;

  return (
    <main className={`command-canvas${blueprint ? " command-canvas-complete" : ""}`}>
      <header className="command-canvas-header"><button className="command-canvas-brand" type="button" onClick={() => router.push("/")}><span>✦</span><b>NORTHSTAR</b></button><div><span className="command-canvas-status"><i /> {thinking ? "UNDERSTANDING" : "PRIVATE WORKSPACE"}</span><button className="command-canvas-exit" type="button" onClick={() => router.push("/dashboard")}>Workspace <b>↗</b></button></div></header>
      <div className="command-canvas-stage">
        <section className="command-canvas-workspace" aria-labelledby="canvas-title">
          <div className="command-canvas-heading"><span className="command-canvas-ai-mark" aria-hidden="true">✦</span><p className="command-canvas-kicker">Northstar AI architect</p><h1 id="canvas-title">Let&apos;s build your system.</h1><p>Tell me how your business works. I&apos;ll turn what I learn into the software your team needs.</p></div>
          <div className="command-canvas-thread" aria-live="polite">
            {turns.map((turn, index) => <article className="command-canvas-turn" key={`${turn.question.key}-${index}`}><span>YOU</span><p>{turn.answer}</p></article>)}
            {thinking || draftBuilding ? <div className="command-canvas-thinking"><span className="command-canvas-thinking-dot" /><div><b>{draftBuilding ? "BUILDING YOUR SYSTEM" : "UNDERSTANDING YOUR BUSINESS"}</b><small>{draftBuilding ? "Turning this conversation into a validated draft" : "Mapping the next useful part of the system"}</small></div></div> : null}
            {assistantMessage && !thinking ? <div className="command-canvas-reply"><span>NORTHSTAR</span><p>{assistantMessage}</p></div> : null}
          </div>
          {error ? <p className="command-canvas-error" role="alert">{error}</p> : null}
          {question ? <form className="command-canvas-input-wrap" onSubmit={submitMessage}><label htmlFor="command-message">Tell Northstar how your business works</label><textarea id="command-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Tell Northstar how your business works..." rows={2} disabled={thinking || draftBuilding} /><button type="submit" aria-label="Send response" disabled={thinking || draftBuilding || !message.trim()}>↑</button><small>Enter · Shift + Enter for a new line</small></form> : null}
          {!turns.length ? <div className="command-canvas-examples"><span>Start with a command</span>{examples.map((example) => <button key={example} type="button" onClick={() => setMessage(example)}>{example}</button>)}</div> : null}
        </section>
        <aside className="command-canvas-learning" aria-label="Northstar is learning"><div className="command-canvas-learning-head"><span className="command-canvas-kicker">Live understanding</span><strong>Northstar is learning</strong><small>Only from what you share</small></div><div className="command-canvas-learning-meter"><span>{factChips.length ? `${factChips.length} areas discovered` : "Listening for the shape of your business"}</span><i><b style={{ width: `${Math.min(100, factChips.length * 18)}%` }} /></i></div><div className="command-canvas-facts">{factChips.length ? factChips.map((fact) => <span className="command-canvas-fact" key={fact}>{fact}</span>) : <p>Facts will appear here as the conversation takes shape.</p>}</div><div className="command-canvas-learning-note"><span aria-hidden="true">✦</span><p>Every detail helps shape a system that fits the way your team works.</p></div></aside>
      </div>
      {!question && !blueprint ? <div className="command-canvas-draft-bar" role="region" aria-label="Create your system draft"><div><b>{draftBuilding ? "Northstar is building your system" : "Your conversation is ready"}</b><small>{draftBuilding ? "Turning what you shared into a validated draft." : "Create a first system draft from everything you told Northstar."}</small>{error ? <span className="command-canvas-draft-error" role="alert">{error}</span> : null}</div><button className="command-canvas-draft" type="button" onClick={createBlueprint} disabled={draftBuilding}>{draftBuilding ? "Building your system..." : "Create System Draft"}<b>→</b></button></div> : null}
      {blueprint ? <section ref={draftSectionRef} id={draftId ? `system-draft-${draftId}` : undefined} className="command-canvas-learned" tabIndex={-1} aria-labelledby="learned-title"><div className="command-canvas-learned-top"><span className="command-canvas-ai-mark" aria-hidden="true">✦</span><p className="command-canvas-kicker">System understanding captured</p><h2 id="learned-title">Here&apos;s what I&apos;ve learned.</h2><p>I&apos;ve turned the conversation into a validated first design for your business.</p></div><div className="command-canvas-blueprint-grid"><article><span>Structure</span><strong>{blueprint.entities?.length ?? 0} operating areas</strong><small>{blueprint.entities?.map((item) => item.label ?? item.key).join(" · ")}</small></article><article><span>Workflows</span><strong>{blueprint.workflows?.length ?? 0} connected flows</strong><small>{blueprint.workflows?.map((item) => item.name ?? item.key).join(" · ")}</small></article><article><span>Status</span><strong>{draftStatus === "approved" ? "Approved" : "Ready for review"}</strong><small>Draft {draftId}</small></article></div><button className="command-canvas-review-button" type="button" onClick={() => setReviewOpen((open) => !open)} aria-expanded={reviewOpen}>{reviewOpen ? "Hide System Draft" : "Review System Draft"}<b>→</b></button>{reviewOpen ? <BlueprintReview blueprint={blueprint} draftStatus={draftStatus} reviewBusy={reviewBusy} onSubmit={() => void transitionDraft("submit")} onApprove={() => void transitionDraft("approve")} /> : null}</section> : null}
    </main>
  );
}

function getFactChips(facts: Record<string, unknown>): string[] {
  const labels: string[] = [];
  const groups: Record<string, string> = { inventoryAssets: "Inventory", workflows: "Operations", people: "Team", goals: "Goals", customers: "Customers", offerings: "Offerings", scheduling: "Scheduling", payments: "Payments", tools: "Tools", automation: "Automation" };
  for (const [key, value] of Object.entries(facts)) {
    if (key === "metadata" || !value || typeof value !== "object") continue;
    const hasEvidence = Object.values(value).some((item) => Array.isArray(item) ? item.length > 0 : Boolean(item));
    if (hasEvidence && groups[key]) labels.push(groups[key]);
  }
  return labels;
}

function BlueprintReview({
  blueprint,
  draftStatus,
  reviewBusy,
  onSubmit,
  onApprove,
}: {
  blueprint: Blueprint;
  draftStatus: DraftStatus;
  reviewBusy: boolean;
  onSubmit: () => void;
  onApprove: () => void;
}) {
  return <div className="command-canvas-review" aria-label="System draft review">
    <div className="command-canvas-review-intro"><span className="command-canvas-kicker">System Draft</span><h3>{blueprint.business?.summary ?? "Northstar system draft"}</h3><p>{blueprint.business?.operationalFocus ?? "Review the structure Northstar created from this conversation."}</p></div>
    <ReviewGroup title="Entities and fields">{blueprint.entities?.map((entity) => <article key={entity.key}><strong>{entity.label ?? entity.key}</strong><small>{entity.description}</small><ul>{entity.fields?.map((field) => <li key={field.key}><b>{field.label ?? field.key}</b><span>{field.type}{field.required ? " · required" : ""}{field.referenceEntity ? ` · references ${field.referenceEntity}` : ""}</span></li>)}</ul></article>)}</ReviewGroup>
    <ReviewGroup title="Workflows">{blueprint.workflows?.map((workflow) => <article key={workflow.key}><strong>{workflow.name ?? workflow.key}</strong><small>{workflow.description}</small><ul>{workflow.steps?.map((step) => <li key={step.key}><b>{step.type}</b><span>{step.description}{step.entity ? ` · ${step.entity}` : ""}</span></li>)}</ul></article>)}</ReviewGroup>
    <ReviewGroup title="Roles and permissions">{blueprint.roles?.map((role) => <article key={role.key}><strong>{role.name ?? role.key}</strong><small>{role.description}</small><ul>{role.permissions?.map((permission, index) => <li key={`${permission.action}-${permission.entity}-${index}`}><b>{permission.action}</b><span>{permission.entity}{permission.field ? ` · ${permission.field}` : ""}</span></li>)}</ul></article>)}</ReviewGroup>
    {blueprint.relationships?.length ? <ReviewGroup title="Relationships">{blueprint.relationships.map((relationship, index) => <article key={`${relationship.fromEntity}-${relationship.toEntity}-${index}`}><strong>{relationship.label}</strong><small>{relationship.fromEntity} {relationship.relationshipType} {relationship.toEntity}</small></article>)}</ReviewGroup> : null}
    <ReviewGroup title="Views, automation, integrations, and reports"><div className="command-canvas-review-list">{[...(blueprint.views ?? []).map((item) => `View: ${item.name ?? item.key} · ${item.type}`), ...(blueprint.automations ?? []).map((item) => `Automation: ${item.key} · ${item.trigger}`), ...(blueprint.integrations ?? []).map((item) => `Integration: ${item.provider} · ${item.capability}`), ...(blueprint.reports ?? []).map((item) => `Report: ${item.name ?? item.key}`)].map((item) => <span key={item}>{item}</span>)}</div></ReviewGroup>
    {blueprint.agent ? <ReviewGroup title="Agent"><article><strong>{blueprint.agent.name}</strong><small>{blueprint.agent.mission}</small></article></ReviewGroup> : null}
    <div className="command-canvas-review-actions">{draftStatus === "draft" || draftStatus === "rejected" ? <button type="button" onClick={onSubmit} disabled={reviewBusy}>{reviewBusy ? "Submitting..." : "Submit for Approval"}</button> : null}{draftStatus === "in_review" ? <button type="button" onClick={onApprove} disabled={reviewBusy}>{reviewBusy ? "Approving..." : "Approve System Draft"}</button> : null}{draftStatus === "approved" ? <strong>Approved. Ready for the separate build step.</strong> : null}</div>
  </div>;
}

function ReviewGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="command-canvas-review-group"><h4>{title}</h4><div>{children}</div></section>;
}

function SystemExperience({
  blueprint,
  draftStatus,
  draftId,
  reviewBusy,
  expandedCard,
  onExpand,
  onBack,
  onSubmit,
  onApprove,
  onBuild,
  provisioning,
  provisioningStatus,
  error,
}: {
  blueprint: Blueprint;
  draftStatus: DraftStatus;
  draftId: string | null;
  reviewBusy: boolean;
  expandedCard: string | null;
  onExpand: (key: string | null) => void;
  onBack: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onBuild: () => void;
  provisioning: boolean;
  provisioningStatus: string;
  error: string;
}) {
  const cards = [
    ...(blueprint.entities ?? []).map((entity) => ({
      key: `entity:${entity.key}`,
      type: "Entity",
      title: entity.label ?? entity.key ?? "Untitled entity",
      summary: entity.description ?? "Generated operating record.",
      details: entity.fields?.map((field) => `${field.label ?? field.key} · ${field.type}${field.required ? " · required" : ""}`) ?? [],
    })),
    ...(blueprint.workflows ?? []).map((workflow) => ({
      key: `workflow:${workflow.key}`,
      type: "Workflow",
      title: workflow.name ?? workflow.key ?? "Untitled workflow",
      summary: workflow.description ?? "Generated operating workflow.",
      details: workflow.steps?.map((step) => `${step.type} · ${step.description}`) ?? [],
    })),
    ...(blueprint.roles ?? []).map((role) => ({
      key: `role:${role.key}`,
      type: "Role",
      title: role.name ?? role.key ?? "Untitled role",
      summary: role.description ?? "Generated responsibility group.",
      details: role.permissions?.map((permission) => `${permission.action} · ${permission.entity}${permission.field ? ` · ${permission.field}` : ""}`) ?? [],
    })),
  ];

  return <main className="command-canvas command-canvas-system-view">
    <header className="command-canvas-header"><button className="command-canvas-brand" type="button" onClick={onBack}><span>✦</span><b>NORTHSTAR</b></button><div><span className="command-canvas-status"><i /> GENERATED SYSTEM</span><button className="command-canvas-conversation-back" type="button" onClick={onBack}>← Conversation</button></div></header>
    <section className="command-canvas-system-shell" aria-labelledby="system-title">
      <div className="command-canvas-system-heading"><p className="command-canvas-kicker">Northstar System</p><h1 id="system-title">Here&apos;s what I designed for your business.</h1><p>{blueprint.business?.summary ?? "A connected operating system shaped from your conversation."}</p><span className="command-canvas-system-status">Draft {draftId} · {draftStatus === "approved" ? "Approved" : "Needs your review"}</span></div>
      <div className="command-canvas-system-map" aria-label="Generated system map">{cards.map((card, index) => <button className={`command-canvas-system-card${expandedCard === card.key ? " is-expanded" : ""}`} type="button" key={card.key} onClick={() => onExpand(expandedCard === card.key ? null : card.key)} style={{ "--card-index": index } as CSSProperties}><span>{card.type}</span><strong>{card.title}</strong><small>{card.summary}</small>{expandedCard === card.key ? <ul>{card.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}<b className="command-canvas-system-card-mark">{expandedCard === card.key ? "−" : "+"}</b></button>)}</div>
      <div className="command-canvas-system-footer"><div><p className="command-canvas-kicker">{provisioning ? "Northstar is building" : "Human review required"}</p><h2>{provisioning ? `Provisioning system · ${provisioningStatus}` : draftStatus === "approved" ? "System approved" : "Review the system before it runs."}</h2><p>{provisioning ? "Creating the generated runtime from the approved blueprint. This status comes from the provisioning service." : draftStatus === "approved" ? "This blueprint is approved and ready for the separate build step." : "Nothing is approved, built, or activated until you choose to continue."}</p>{error ? <span className="command-canvas-draft-error" role="alert">{error}</span> : null}</div><div className="command-canvas-system-actions">{draftStatus === "draft" || draftStatus === "rejected" ? <button type="button" onClick={onSubmit} disabled={reviewBusy || provisioning}>Review &amp; Approve System <b>→</b></button> : null}{draftStatus === "in_review" ? <button type="button" onClick={onApprove} disabled={reviewBusy || provisioning}>{reviewBusy ? "Approving..." : "Approve System"}<b>→</b></button> : null}{draftStatus === "approved" && !provisioning ? <button type="button" onClick={onBuild}>{provisioningStatus === "failed" ? "Retry Build" : "Build System"} <b>→</b></button> : null}{provisioning ? <strong>Building · {provisioningStatus}</strong> : null}</div></div>
    </section>
  </main>;
}
