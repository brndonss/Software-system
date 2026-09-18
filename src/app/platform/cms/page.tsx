"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const structuredData = [
  ["Customers", "126", "Records + lifecycle"],
  ["Leads", "18", "Source + status"],
  ["Tasks", "24", "Owners + due dates"],
  ["Follow-ups", "07", "Next steps"],
];

const contextLayers = [
  ["Customers", "Business records"],
  ["Leads", "Opportunity flow"],
  ["Tasks", "Operational work"],
  ["Workflows", "Repeatable process"],
  ["Automations", "Approved actions"],
  ["Activity", "Visible history"],
];

export default function CmsPage() {
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

  return <main className="ns-cms-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-cms-hero"><div className="ns-cms-container"><p className="ns-kicker">STRUCTURED BUSINESS INFORMATION</p><h1>Your business information, structured for action.</h1><p className="ns-cms-lede">CMS is a future product direction for turning scattered business information into organized context that the operating system can use across customers, leads, tasks, workflows, automations, and activity.</p><div className="ns-cms-actions"><button className="ns-button ns-cms-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#cms-visual" className="ns-cms-secondary">See the model <span>↓</span></a></div><p className="ns-cms-note"><span /> This is a product direction, not a standalone CMS currently available.</p></div></section><section id="cms-visual" className="ns-cms-visual"><div className="ns-cms-container"><div className="ns-cms-visual-heading"><div><p className="ns-kicker">BUSINESS CONTEXT IN MOTION</p><h2>Information becomes something the system can work with.</h2></div><p>The repository currently supports structured modules, fields, dashboard widgets, generated workflows, automations, and activity. A dedicated information layer is the direction that connects those pieces more deliberately.</p></div><div className="ns-cms-console"><div className="ns-cms-console-top"><span>BUSINESS INFORMATION / STRUCTURE PREVIEW</span><b>CONCEPT</b></div><div className="ns-cms-console-body"><div className="ns-cms-data-grid">{structuredData.map(([name, value, detail]) => <div key={name}><small>{name}</small><b>{value}</b><span>{detail}</span></div>)}</div><div className="ns-cms-flow-line"><div className="ns-cms-flow-box"><small>STRUCTURED BUSINESS CONTEXT</small><b>Consistent information for the operating system</b></div><i aria-hidden="true">↓</i><div className="ns-cms-flow-box dark"><small>CONNECTED LAYERS</small><div><span>Agents</span><span>Workflows</span><span>Automations</span></div></div><i aria-hidden="true">↓</i><div className="ns-cms-flow-box"><small>VISIBLE RESULT</small><b>Activity</b></div></div></div></div></div></section><section className="ns-cms-sections ns-cms-container"><div className="ns-cms-heading"><p className="ns-kicker">THE INFORMATION LAYER</p><h2>One place for the context that matters.</h2><p>The goal is not to publish website content. It is to give the business system an organized understanding of the information behind daily operations.</p></div><div className="ns-cms-grid"><article><span>01</span><h3>Organize the information that matters</h3><p>Customers, leads, tasks, and follow-ups are already represented as business concepts with fields, statuses, and operational context.</p></article><article><span>02</span><h3>Connect information to action</h3><p>Structured context can support generated workflows, task assignment, follow-up processes, and approved automation concepts.</p></article><article><span>03</span><h3>Keep information connected</h3><p>The product direction is to reduce the gaps between records, work, decisions, and the history of what happened.</p></article><article><span>04</span><h3>Built for an operating system</h3><p>A traditional CMS publishes pages. This concept organizes business context so software can reason about the work around it.</p></article></div></section><section className="ns-cms-capabilities ns-cms-container"><div className="ns-cms-heading"><p className="ns-kicker">CONNECTED BUSINESS CONTEXT</p><h2>The layer is useful because the operating pieces already have a place.</h2></div><div className="ns-cms-capability-grid">{contextLayers.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-cms-outcome ns-cms-container"><p className="ns-kicker">THE OUTCOME</p><h2>Less scattered information. More context for the work.</h2><p>The current foundation is generated from onboarding information and system configuration. CMS is the future direction for making business information more structured, connected, and useful across the operating system.</p><button className="ns-button ns-cms-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
