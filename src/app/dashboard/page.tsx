"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Configuration = {
  businessSummary: { niche: string; primaryGoals: string[] };
  modules: { key: string; name: string; enabled: boolean; fields: { key: string; label: string; type: string }[] }[];
  dashboard: { widgets: { type: string; module: string; metric?: string; groupBy?: string }[] };
};

type Customer = { id: string; business_name: string; slug: string };

type Automation = { id: string; title: string; description?: string | null; problem?: string | null; workflow?: string | null; status: string; enabled: boolean; approval_status: string };

type Activity = { id: string; automation: string; action: string; status: string; result_summary?: string | null; approval_status: string; created_at: string };

export default function DashboardPage() {
  const router = useRouter();
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const me = await fetch("/api/v1/auth/me");
        const meData = await me.json();
        if (!me.ok) throw new Error(meData.error?.message ?? "Unable to load your workspace");
        const customerId = meData.profile?.customer_id;
        if (!customerId) throw new Error("Customer profile not found");
        const [configResponse, automationsResponse, activityResponse, customerResponse] = await Promise.all([
          fetch("/api/v1/system-configurations/active"),
          fetch("/api/v1/business/automations"),
          fetch("/api/v1/business/activity"),
          fetch(`/api/v1/customers/${customerId}`),
        ]);

        const configData = await configResponse.json();
        if (!configResponse.ok) throw new Error(configData.error?.message ?? "Unable to load workspace");
        const automationData = await automationsResponse.json();
        const activityData = await activityResponse.json();
        const customerData = await customerResponse.json();

        setConfiguration(configData.configuration.configuration);
        setAutomations(automationData.automations ?? []);
        setActivity(activityData.activities ?? []);
        setCustomer(customerData.customer ?? null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load workspace");
      }
    }

    load();
  }, []);

  const enabledModules = useMemo(() => configuration?.modules.filter((module) => module.enabled) ?? [], [configuration]);

  if (error) return <main className="configured-shell"><div className="configured-wrap"><div className="configured-card"><p className="eyebrow">Northstar</p><h1>Your workspace is not ready yet.</h1><p>{error}</p><button className="primary" onClick={() => router.push("/onboarding")}>Return to onboarding <span>→</span></button></div></div></main>;
  if (!configuration) return <main className="configured-shell"><div className="configured-wrap"><div className="configured-card"><p className="eyebrow">Northstar</p><h1>Loading your workspace...</h1></div></div></main>;

  return <main className="configured-shell"><div className="configured-wrap"><header className="configured-header"><div className="brand"><span className="brand-mark">N</span><span>northstar</span></div><span className="configured-label">Personalized workspace</span></header><div className="configured-intro"><p className="eyebrow">{configuration.businessSummary.niche}</p><h1>Built for {customer?.business_name ?? "your business"}</h1><p>Built around {configuration.businessSummary.primaryGoals[0] ?? "your goals"}.</p></div><div className="dashboard-grid"><section className="dashboard-panel"><h2>Core modules</h2><div className="configured-modules">{enabledModules.map((module) => <article className="configured-module" key={module.key}><span className="module-symbol">{module.name.slice(0, 1)}</span><h3>{module.name}</h3><p>{module.fields.length} configured fields</p><button>Open module <span>→</span></button></article>)}</div></section><aside className="dashboard-panel sidebar-panel"><h2>Recommended automations</h2>{automations.length ? automations.map((automation) => <div className="mini-card" key={automation.id}><strong>{automation.title}</strong><p>{automation.description ?? automation.problem ?? "Recommended by Northstar AI"}</p><span className="status-pill">{automation.status}</span></div>) : <p className="empty-state">No automations were recommended yet.</p>}</aside></div><section className="dashboard-panel activity-panel"><h2>Activity log</h2><div className="activity-list">{activity.length ? activity.map((item) => <div className="activity-row" key={item.id}><div><strong>{item.action}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div><span className="status-pill">{item.status}</span></div>) : <p className="empty-state">No activity yet.</p>}</div></section></div></main>;
}
