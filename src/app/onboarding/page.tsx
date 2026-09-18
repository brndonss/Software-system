"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QuestionKind = "text" | "textarea" | "single_select" | "multi_select" | "number" | "boolean" | "date" | "json";
type Question = { key: string; domain: string; prompt: string; kind: QuestionKind; options: { value: string; label: string }[] };
type Session = { id: string; status: "in_progress" | "awaiting_input" | "completed" | "abandoned" };
type HistoryItem = { question: Question; answer: unknown };
type Completion = { status: "complete"; state: { coveredDomains: string[]; confidence: number; reason: string | null } };

const steps = [
  ["01", "Your business", "The shape of the work."],
  ["02", "Your operating reality", "Where momentum gets lost."],
  ["03", "Your next system", "What Northstar should improve."],
];

export default function OnboardingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState<Completion | null>(null);

  useEffect(() => { void initializeSession(); }, []);

  async function initializeSession() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/onboarding/sessions");
      if (response.status === 401) { router.push("/"); return; }
      if (!response.ok) throw new Error("Unable to load your onboarding session.");
      const data = await response.json() as { sessions: Session[] };
      let active = data.sessions.find((item) => item.status === "in_progress" || item.status === "awaiting_input");
      if (!active) {
        const created = await fetch("/api/v1/onboarding/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: null, metadata: {} }),
        });
        if (!created.ok) throw new Error((await created.json()).error?.message ?? "Unable to start your business interview.");
        active = (await created.json() as { session: Session }).session;
      }
      setSession(active);
      const savedHistory = sessionStorage.getItem(`onboarding-history:${active.id}`);
      if (savedHistory) setHistory(JSON.parse(savedHistory) as HistoryItem[]);
      await loadNextQuestion(active.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start your business interview.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNextQuestion(sessionId: string) {
    const response = await fetch(`/api/v1/onboarding/sessions/${sessionId}/next-question`);
    if (!response.ok) throw new Error((await response.json()).error?.message ?? "Unable to determine the next question.");
    const result = await response.json() as { question: Question | null; status: "ready" | "complete" | "blocked" };
    if (result.status === "complete") { await completeSession(sessionId); return; }
    if (result.status === "blocked" || !result.question) throw new Error("The interview needs attention before it can continue.");
    setQuestion(result.question);
    setAnswer("");
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !question || !answer.trim()) return;
    setSaving(true);
    setError("");
    try {
      const value = parseAnswer(question.kind, answer);
      const response = await fetch(`/api/v1/onboarding/sessions/${session.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionKey: question.key, answer: value, metadata: {} }),
      });
      if (!response.ok) throw new Error((await response.json()).error?.message ?? "Unable to save that answer.");
      setHistory((current) => {
        const next = [...current, { question, answer: value }];
        sessionStorage.setItem(`onboarding-history:${session.id}`, JSON.stringify(next));
        return next;
      });
      await loadNextQuestion(session.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save that answer.");
    } finally {
      setSaving(false);
    }
  }

  async function completeSession(sessionId: string) {
    const response = await fetch(`/api/v1/onboarding/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error((await response.json()).error?.message ?? "Your business understanding is not ready to complete.");
    const data = await response.json() as { completion: Completion };
    setCompletion(data.completion);
    setQuestion(null);
    setSession((current) => current ? { ...current, status: "completed" } : current);
  }

  if (loading) return <main className="onboarding-v2"><div className="onboarding-v2-loading"><span className="onboarding-v2-mark">N</span><p>Preparing your workspace</p></div></main>;

  return (
    <main className="onboarding-v2">
      <div className="onboarding-v2-shell">
        <aside className="onboarding-v2-aside">
          <button className="onboarding-v2-brand" type="button" onClick={() => router.push("/")}><span>N</span><b>NORTHSTAR</b></button>
          <div className="onboarding-v2-aside-copy"><p className="onboarding-v2-kicker">Business interview</p><h1>Your business is the starting point.</h1><p>Tell Northstar how the work happens. The system will use your answers to build a structured understanding.</p></div>
          <div className="onboarding-v2-steps">{steps.map(([number, title, detail]) => <div className="onboarding-v2-step" key={number}><span>{number}</span><div><b>{title}</b><small>{detail}</small></div></div>)}</div>
          <div className="onboarding-v2-aside-footer"><span className="onboarding-v2-pulse" /> Private to your workspace<br /><small>Your answers shape the next question.</small></div>
        </aside>
        <section className="onboarding-v2-content">
          <header className="onboarding-v2-header"><span>{history.length + 1} / INTERVIEW</span><button type="button" onClick={() => router.push("/")}>Exit setup <b>Esc</b></button></header>
          <div className="onboarding-v2-form-wrap">
            {completion ? <CompletionState completion={completion} /> : <InterviewContent history={history} question={question} answer={answer} error={error} saving={saving} onAnswerChange={setAnswer} onSubmit={submitAnswer} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function InterviewContent({ history, question, answer, error, saving, onAnswerChange, onSubmit }: { history: HistoryItem[]; question: Question | null; answer: string; error: string; saving: boolean; onAnswerChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <>
    <div className="onboarding-v2-intro"><p className="onboarding-v2-kicker">Let&apos;s get specific</p><h2>Tell us how your business actually works.</h2><p>Start in your own words. Northstar will ask what it needs to understand next.</p></div>
    <div className="onboarding-v2-history">{history.map((item, index) => <article className="onboarding-v2-message" key={`${item.question.key}-${index}`}><span className="onboarding-v2-message-label">{item.question.domain}</span><p className="onboarding-v2-message-question">{item.question.prompt}</p><p className="onboarding-v2-message-answer">{formatAnswer(item.answer)}</p></article>)}</div>
    {question && <form className="onboarding-v2-form" onSubmit={onSubmit}><fieldset><legend><span>{String(history.length + 1).padStart(2, "0")}</span> {question.domain}</legend><p className="onboarding-v2-question">{question.prompt}</p><QuestionInput question={question} value={answer} onChange={onAnswerChange} /></fieldset>{error && <p className="onboarding-v2-error">{error}</p>}<div className="onboarding-v2-actions"><span>Northstar chooses the next question from your answers.</span><button className="onboarding-v2-submit" type="submit" disabled={saving || !answer.trim()}>{saving ? "Saving your answer..." : "Continue"}<b>↗</b></button></div></form>}
    {!question && error && <p className="onboarding-v2-error">{error}</p>}
  </>;
}

function QuestionInput({ question, value, onChange }: { question: Question; value: string; onChange: (value: string) => void }) {
  if (question.kind === "single_select" || question.kind === "boolean") {
    return <select className="onboarding-v2-answer-control" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose one</option>{question.kind === "boolean" ? <><option value="true">Yes</option><option value="false">No</option></> : question.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>;
  }
  if (question.kind === "textarea" || question.kind === "json" || question.kind === "multi_select") {
    return <textarea className="onboarding-v2-answer-control" value={value} onChange={(event) => onChange(event.target.value)} placeholder={question.kind === "json" ? "Enter a JSON object" : "Write naturally..."} rows={5} />;
  }
  return <input className="onboarding-v2-answer-control" type={question.kind === "number" ? "number" : question.kind === "date" ? "date" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write naturally..." />;
}

function parseAnswer(kind: QuestionKind, value: string): unknown {
  if (kind === "number") return Number(value);
  if (kind === "boolean") return value === "true";
  if (kind === "multi_select") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (kind === "json") return JSON.parse(value) as unknown;
  return value;
}

function formatAnswer(value: unknown) { return typeof value === "string" ? value : JSON.stringify(value); }

function CompletionState({ completion }: { completion: Completion }) {
  return <div className="onboarding-v2-completion"><p className="onboarding-v2-kicker">Business understanding captured</p><h2>Northstar has a clearer picture of how your business works.</h2><p>{completion.state.reason ?? "The interview is complete."}</p><div className="onboarding-v2-completion-meta"><span>{completion.state.coveredDomains.length} areas understood</span><span>{Math.round(completion.state.confidence * 100)}% confidence</span></div><div className="onboarding-v2-completion-note">Your answers are saved. The next step is to turn this understanding into a reviewable system design.</div></div>;
}
