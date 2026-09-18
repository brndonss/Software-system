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

const initialData: FormData = {
  businessNiche: "",
  businessSize: "",
  servicesProducts: "",
  currentSoftwareTools: "",
  biggestBusinessStruggles: "",
  repetitiveTasks: "",
  desiredAutomations: "",
  softwareGoals: "",
  additionalInformation: "",
};

const steps = [
  ["01", "Your business", "The shape of the work."],
  ["02", "Your operating reality", "Where momentum gets lost."],
  ["03", "Your next system", "What Northstar should improve."],
];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/onboarding").then(async (response) => {
      if (response.status === 401) { router.push("/"); return; }
      if (!response.ok) throw new Error("Unable to load onboarding");
      const { onboarding } = await response.json();
      if (onboarding) setForm({
        businessNiche: onboarding.business_niche ?? "",
        businessSize: onboarding.business_size ?? "",
        servicesProducts: onboarding.services_products ?? "",
        currentSoftwareTools: onboarding.current_software_tools ?? "",
        biggestBusinessStruggles: onboarding.biggest_business_struggles ?? "",
        repetitiveTasks: onboarding.repetitive_tasks ?? "",
        desiredAutomations: onboarding.desired_automations ?? "",
        softwareGoals: onboarding.software_goals ?? "",
        additionalInformation: onboarding.additional_information ?? "",
      });
    }).catch(() => setError("Unable to load your onboarding information.")).finally(() => setLoading(false));
  }, [router]);

  function update(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/v1/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "completed" }),
      });
      if (!response.ok) {
        setError((await response.json()).error?.message ?? "Unable to save onboarding.");
        return;
      }
      const identity = await fetch("/api/v1/auth/me");
      const identityData = await identity.json();
      const build = await fetch("/api/v1/system-builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: identityData.profile?.customer_id }),
      });
      const buildData = await build.json();
      if (!build.ok) { setError(buildData.error?.message ?? "Unable to start your system build."); return; }
      router.push(`/building/${buildData.build.id}`);
    } catch {
      setError("Unable to save your workspace setup. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="onboarding-v2"><div className="onboarding-v2-loading"><span className="onboarding-v2-mark">N</span><p>Preparing your workspace</p></div></main>;

  return <main className="onboarding-v2">
    <div className="onboarding-v2-shell">
      <aside className="onboarding-v2-aside">
        <button className="onboarding-v2-brand" type="button" onClick={() => router.push("/")}><span>N</span><b>NORTHSTAR</b></button>
        <div className="onboarding-v2-aside-copy"><p className="onboarding-v2-kicker">Workspace setup</p><h1>Your business is the starting point.</h1><p>Give Northstar the context behind the work. We&apos;ll use it to shape a system that feels like yours.</p></div>
        <div className="onboarding-v2-steps">{steps.map(([number, title, detail]) => <div className="onboarding-v2-step" key={number}><span>{number}</span><div><b>{title}</b><small>{detail}</small></div></div>)}</div>
        <div className="onboarding-v2-aside-footer"><span className="onboarding-v2-pulse" /> Private to your workspace<br /><small>Usually takes less than 4 minutes.</small></div>
      </aside>
      <section className="onboarding-v2-content">
        <header className="onboarding-v2-header"><span>01 / 03</span><button type="button" onClick={() => router.push("/")}>Exit setup <b>Esc</b></button></header>
        <div className="onboarding-v2-form-wrap"><div className="onboarding-v2-intro"><p className="onboarding-v2-kicker">Let&apos;s get specific</p><h2>Tell us how your business actually works.</h2><p>Skip the polished version. The useful details are usually in the messy parts.</p></div>
          <form className="onboarding-v2-form" onSubmit={submit}>
            <fieldset><legend><span>01</span> The essentials</legend><div className="onboarding-v2-grid"><Field label="Business name or industry" value={form.businessNiche} onChange={(value) => update("businessNiche", value)} placeholder="e.g. residential construction" required /><label className="onboarding-v2-field">Team size<select required value={form.businessSize} onChange={(event) => update("businessSize", event.target.value)}><option value="">Choose one</option><option value="solo">Just me</option><option value="2-10">2-10 people</option><option value="11-50">11-50 people</option><option value="51-200">51-200 people</option><option value="201+">201+ people</option></select></label></div><Field label="What do customers come to you for?" value={form.servicesProducts} onChange={(value) => update("servicesProducts", value)} placeholder="Describe your products, services, or the work you deliver." required textarea /></fieldset>
            <fieldset><legend><span>02</span> The friction</legend><Field label="Where does work slow down or get dropped?" value={form.biggestBusinessStruggles} onChange={(value) => update("biggestBusinessStruggles", value)} placeholder="Tell us about the bottlenecks, handoffs, or tasks that drain attention." textarea /><div className="onboarding-v2-grid"><Field label="Tools you use today" value={form.currentSoftwareTools} onChange={(value) => update("currentSoftwareTools", value)} placeholder="Email, spreadsheets, QuickBooks..." /><Field label="Work you repeat most often" value={form.repetitiveTasks} onChange={(value) => update("repetitiveTasks", value)} placeholder="Follow-ups, scheduling, reports..." /></div></fieldset>
            <fieldset><legend><span>03</span> The direction</legend><Field label="What would you like to improve first?" value={form.desiredAutomations} onChange={(value) => update("desiredAutomations", value)} placeholder="Describe the process you want to make lighter." textarea /><div className="onboarding-v2-grid"><Field label="What does a great outcome look like?" value={form.softwareGoals} onChange={(value) => update("softwareGoals", value)} placeholder="More capacity, fewer dropped leads..." textarea /><Field label="Anything else Northstar should know?" value={form.additionalInformation} onChange={(value) => update("additionalInformation", value)} placeholder="Optional context" textarea /></div></fieldset>
            {error && <p className="onboarding-v2-error">{error}</p>}<div className="onboarding-v2-actions"><span>Northstar will use this to prepare your workspace.</span><button className="onboarding-v2-submit" type="submit" disabled={saving}>{saving ? "Building your context..." : "Create my workspace"}<b>↗</b></button></div>
          </form>
        </div>
      </section>
    </div>
  </main>;
}

function Field({ label, value, onChange, placeholder, textarea = false, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; textarea?: boolean; required?: boolean }) {
  return <label className="onboarding-v2-field">{label}{textarea ? <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} /> : <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}</label>;
}
