"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const agentRoles = [
  ["01", "Sales Agent", "A future business worker for lead context, follow-up opportunities, and prepared next steps."],
  ["02", "Customer Agent", "A future business worker for customer context, reminders, and relationship continuity."],
  ["03", "Operations Agent", "A future business worker for tasks, repeatable work, and operational attention."],
  ["04", "Growth Agent", "A future business worker for recommendations and campaign preparation."],
];

const connectedSystem = [
  ["Customers", "Context"],
  ["Leads", "Signals"],
  ["Tasks", "Work"],
  ["Workflows", "Process"],
  ["Automations", "Execution"],
  ["Activity", "Results"],
];

export default function AgentsPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");

  function openAuth(mode: "sign-in" | "create") {
    setAuthMode(mode);
    setShowAuth(true);
    setMenuOpen(false);
    setProductMenuOpen(false);
  }

  function navigateToLanding(id: string) {
    router.push(id ? `/#${id}` : "/");
  }

  return <main className="ns-agents-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-agents-hero"><div className="ns-agents-container"><p className="ns-kicker">A FUTURE DIRECTION FOR THE PLATFORM</p><h1>AI workers for the work behind your business.</h1><p className="ns-agents-lede">Agents are a product direction for business operations: software that understands your context, notices what needs attention, prepares the next action, and keeps an owner in control.</p><div className="ns-agents-actions"><button className="ns-button ns-agents-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#agent-flow" className="ns-agents-secondary">Explore the concept <span>↓</span></a></div><p className="ns-agents-note"><span /> Agents are not available as a working product feature yet.</p></div></section><section id="agent-flow" className="ns-agents-flow ns-agents-container"><div className="ns-agents-heading"><p className="ns-kicker">FROM CONTEXT TO ACTION</p><h2>A business worker with a clear boundary.</h2><p>The intended model keeps business context, recommendations, approvals, and existing operational systems connected without pretending the work is autonomous today.</p></div><div className="ns-agent-pipeline"><div><span>01</span><b>Business context</b><small>What the owner provides</small></div><i aria-hidden="true">↓</i><div><span>02</span><b>Agent</b><small>What interprets the context</small></div><i aria-hidden="true">↓</i><div><span>03</span><b>Identifies work</b><small>What needs attention</small></div><i aria-hidden="true">↓</i><div><span>04</span><b>Prepares action</b><small>Recommendation or draft</small></div><i aria-hidden="true">↓</i><div className="approval"><span>05</span><b>Owner approval</b><small>Control stays with the owner</small></div><i aria-hidden="true">↓</i><div><span>06</span><b>Workflow / automation</b><small>Existing operational layer</small></div><i aria-hidden="true">↓</i><div><span>07</span><b>Activity</b><small>Results stay visible</small></div></div></section><section className="ns-agents-visual"><div className="ns-agents-container"><div className="ns-agents-visual-heading"><div><p className="ns-kicker">THE OPERATING MODEL</p><h2>Useful because it knows the work.</h2></div><p>Agents would sit above the existing business system, using the context already captured in customers, leads, tasks, workflows, automations, and activity.</p></div><div className="ns-agent-console"><div className="ns-agent-console-top"><span>AGENT CONCEPT / PREVIEW</span><b>NOT LIVE</b></div><div className="ns-agent-console-body"><aside><i /> <strong>Business worker</strong><span className="active">Context</span><span>Attention</span><span>Actions</span><span>Approval</span></aside><div className="ns-agent-console-main"><small>OPERATIONS AGENT</small><h3>What needs attention?</h3><div className="ns-agent-signal"><span>LEAD FOLLOW-UP</span><b>Potential next step identified</b><p>A lead has been created and may need a timely follow-up. The intended agent would prepare a recommendation for owner review.</p></div><div className="ns-agent-console-footer"><span><i /> Awaiting owner approval</span><span>Activity stays visible</span></div></div></div></div></div></section><section className="ns-agents-roles ns-agents-container"><div className="ns-agents-heading"><p className="ns-kicker">POSSIBLE AGENT ROLES</p><h2>Different workers. One operating picture.</h2><p>These are examples of the product direction, not currently available agents.</p></div><div className="ns-agent-roles-grid">{agentRoles.map(([number, title, description]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p><small>PRODUCT DIRECTION</small></article>)}</div></section><section className="ns-agents-system ns-agents-container"><div className="ns-agents-heading"><p className="ns-kicker">CONNECTED TO THE SYSTEM</p><h2>Agents would work with the parts already here.</h2></div><div className="ns-connected-grid">{connectedSystem.map(([title, role], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{role}</small></div>)}</div></section><section className="ns-agents-outcome ns-agents-container"><p className="ns-kicker">THE PROMISE</p><h2>More attention on the work that matters. More control over what happens next.</h2><p>The long-term goal is an accountable business worker: useful in the background, clear about its recommendations, and always connected to an owner-approved operating system.</p><button className="ns-button ns-agents-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
