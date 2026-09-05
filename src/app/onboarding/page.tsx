"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FormData = {
  businessNiche: string;
  businessSize: string;
  servicesProducts: string;
  currentSoftwareTools: string;
  biggestBusinessStruggles: string;
  repetitiveTasks: string;
  desiredAutomations: string;
  softwareGoals: string;
  additionalInformation: string;
};

const initialData: FormData = { businessNiche: "", businessSize: "", servicesProducts: "", currentSoftwareTools: "", biggestBusinessStruggles: "", repetitiveTasks: "", desiredAutomations: "", softwareGoals: "", additionalInformation: "" };

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/onboarding").then(async (response) => {
      if (response.status === 401) { router.push("/"); return; }
      if (!response.ok) throw new Error("Unable to load onboarding");
      const { onboarding } = await response.json();
      if (onboarding) setForm({ businessNiche: onboarding.business_niche ?? "", businessSize: onboarding.business_size ?? "", servicesProducts: onboarding.services_products ?? "", currentSoftwareTools: onboarding.current_software_tools ?? "", biggestBusinessStruggles: onboarding.biggest_business_struggles ?? "", repetitiveTasks: onboarding.repetitive_tasks ?? "", desiredAutomations: onboarding.desired_automations ?? "", softwareGoals: onboarding.software_goals ?? "", additionalInformation: onboarding.additional_information ?? "" });
    }).catch(() => setError("Unable to load your onboarding information.")).finally(() => setLoading(false));
  }, [router]);

  function update(field: keyof FormData, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/v1/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, status: "completed" }) });
    if (!response.ok) { setError((await response.json()).error?.message ?? "Unable to save onboarding."); setSaving(false); return; }
    const identity = await fetch("/api/v1/auth/me");
    const identityData = await identity.json();
    const build = await fetch("/api/v1/system-builds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: identityData.profile?.customer_id }) });
    const buildData = await build.json();
    if (!build.ok) { setError(buildData.error?.message ?? "Unable to start your system build."); } else { router.push(`/building/${buildData.build.id}`); }
    setSaving(false);
  }

  if (loading) return <main className="onboarding-shell"><div className="onboarding-card"><p className="eyebrow">Northstar</p><h1>Loading your workspace...</h1></div></main>;
  return <main className="onboarding-shell"><div className="onboarding-card"><div className="onboarding-head"><div><div className="brand"><span className="brand-mark">N</span><span>northstar</span></div><p className="eyebrow">Workspace setup · 01</p><h1>Tell us about your business.</h1><p>Answer a few questions so your workspace can fit the way you work.</p></div><button className="exit-button" onClick={() => router.push("/")}>Exit setup</button></div><div className="progress"><span /></div><form className="onboarding-form" onSubmit={submit}><section><h2>About your business</h2><p className="section-copy">Start with the essentials.</p><div className="form-grid"><Field label="Business name / industry" value={form.businessNiche} onChange={(value) => update("businessNiche", value)} placeholder="e.g. residential construction" required /><label>Business size<select required value={form.businessSize} onChange={(event) => update("businessSize", event.target.value)}><option value="">Select size</option><option value="solo">Just me</option><option value="2-10">2-10 people</option><option value="11-50">11-50 people</option><option value="51-200">51-200 people</option><option value="201+">201+ people</option></select></label></div><Field label="What services or products do you provide?" value={form.servicesProducts} onChange={(value) => update("servicesProducts", value)} placeholder="Describe what customers come to you for" required textarea /></section><section><h2>How you work</h2><p className="section-copy">This helps us understand your day-to-day.</p><Field label="What software or tools do you use today?" value={form.currentSoftwareTools} onChange={(value) => update("currentSoftwareTools", value)} placeholder="e.g. QuickBooks, spreadsheets, email" /><Field label="What are your biggest business struggles?" value={form.biggestBusinessStruggles} onChange={(value) => update("biggestBusinessStruggles", value)} placeholder="Where do things feel harder than they should?" textarea /><Field label="What tasks do you repeat most often?" value={form.repetitiveTasks} onChange={(value) => update("repetitiveTasks", value)} placeholder="e.g. follow-ups, scheduling, reporting" textarea /></section><section><h2>Where you want to go</h2><p className="section-copy">Your answers shape what we prioritize.</p><Field label="What would you like to automate?" value={form.desiredAutomations} onChange={(value) => update("desiredAutomations", value)} placeholder="Describe the processes you want to simplify" textarea /><Field label="What are your goals for this software?" value={form.softwareGoals} onChange={(value) => update("softwareGoals", value)} placeholder="What would a great outcome look like?" textarea /><Field label="Anything else we should know?" value={form.additionalInformation} onChange={(value) => update("additionalInformation", value)} placeholder="Optional context about your business" textarea /></section>{error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}<div className="form-actions"><span>Your answers are private to your workspace.</span><button className="primary" disabled={saving}>{saving ? "Saving..." : "Complete setup"}<span>→</span></button></div></form></div></main>;
}

function Field({ label, value, onChange, placeholder, textarea = false, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; textarea?: boolean; required?: boolean }) {
  return <label>{label}{textarea ? <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} /> : <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}</label>;
}
