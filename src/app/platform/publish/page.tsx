"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const readinessItems = [
  ["Business setup", "Ready"],
  ["Customers", "Connected"],
  ["Tasks", "Configured"],
  ["Workflows", "Prepared"],
  ["Automations", "Reviewed"],
];

const activePieces = [
  ["Customers", "Business context"],
  ["Leads", "Opportunity flow"],
  ["Tasks", "Operational work"],
  ["Workflows", "Repeatable process"],
  ["Automations", "Configured actions"],
  ["Activity", "Visible history"],
];

export default function PublishPage() {
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

  return <main className="ns-publish-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-publish-hero"><div className="ns-publish-container"><p className="ns-kicker">FROM SETUP TO OPERATION</p><h1>Turn your system into operation.</h1><p className="ns-publish-lede">Publish is a future product direction for moving from a configured business system to an active operating state, with the structure and decisions made visible before the work begins.</p><div className="ns-publish-actions"><button className="ns-button ns-publish-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#publish-model" className="ns-publish-secondary">See the model <span>↓</span></a></div><p className="ns-publish-note"><span /> There is no literal Publish action in the current product yet.</p></div></section><section id="publish-model" className="ns-publish-visual"><div className="ns-publish-container"><div className="ns-publish-visual-heading"><div><p className="ns-kicker">SYSTEM READINESS</p><h2>Review what has been shaped before it becomes the way work runs.</h2></div><p>The current product builds a system configuration from onboarding and makes completed configurations available to the dashboard. Publish is the future step between that configuration and an active operating model.</p></div><div className="ns-publish-console"><div className="ns-publish-console-top"><span>SYSTEM READINESS / OPERATION PREVIEW</span><b>CONCEPT</b></div><div className="ns-publish-console-body"><div className="ns-publish-readiness"><small>CONFIGURED SYSTEM</small><h3>Ready for review.</h3>{readinessItems.map(([name, status]) => <div key={name}><span>{name}</span><b>{status}</b></div>)}<div className="ns-publish-review"><span>01</span><b>REVIEW SYSTEM</b><small>Conceptual checkpoint before operation</small></div></div><div className="ns-publish-transition"><small>THE TRANSITION</small><div className="ns-publish-transition-step"><span>01</span><b>Configured system</b><small>Modules, fields, widgets, workflows</small></div><i>↓</i><div className="ns-publish-transition-step highlight"><span>02</span><b>Publish</b><small>Future operating-state transition</small></div><i>↓</i><div className="ns-publish-transition-step"><span>03</span><b>Active system</b><small>Customers, work, and activity</small></div></div></div></div></div></section><section className="ns-publish-sections ns-publish-container"><div className="ns-publish-heading"><p className="ns-kicker">THE PUBLISH DIRECTION</p><h2>A deliberate step from configuration to operation.</h2><p>Publish does not mean putting a website online or deploying infrastructure. It describes a future product moment inside the business operating system.</p></div><div className="ns-publish-grid"><article><span>01</span><h3>Build before you activate</h3><p>Onboarding captures business context, and the system builder generates a configuration with modules, fields, widgets, and workflow templates.</p></article><article><span>02</span><h3>Review the system</h3><p>A future review experience could help a business understand what has been configured before treating it as the active way to operate.</p></article><article><span>03</span><h3>Move from setup to operation</h3><p>The intended transition is configured system, review, publish, and active operations. That publish mechanism is not implemented today.</p></article><article><span>04</span><h3>Keep improving after launch</h3><p>Existing activity and recommendations provide a foundation for a future loop of operating, reviewing, and refining the system.</p></article></div></section><section className="ns-publish-system ns-publish-container"><div className="ns-publish-heading"><p className="ns-kicker">THE ACTIVE SYSTEM</p><h2>One operating picture after the setup work is complete.</h2><p>The active-system concept connects existing business capabilities without claiming that Publish currently activates them automatically.</p></div><div className="ns-publish-piece-grid">{activePieces.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-publish-loop ns-publish-container"><div className="ns-publish-heading"><p className="ns-kicker">OPERATE, THEN IMPROVE</p><h2>Activity can show what happened. Recommendations can suggest what to examine next.</h2><p>The current product includes activity records and recommendation opportunities. Changes to a configuration, automated activation, and a publish workflow remain future product direction.</p></div><div className="ns-publish-loop-line"><span>Operate</span><i>↓</i><span>Activity</span><i>↓</i><span>Recommendations</span><i>↓</i><span>Changes</span><i>↓</i><span>Improved system</span></div></section><section className="ns-publish-clarity ns-publish-container"><p className="ns-kicker">WHAT PUBLISH IS NOT</p><h2>Not a website. Not a deployment button. A business-system transition.</h2><p>This page does not claim production deployment, infrastructure changes, automation activation, campaign sending, content publishing, or external integration setup.</p></section><section className="ns-publish-outcome ns-publish-container"><p className="ns-kicker">THE OUTCOME</p><h2>One system from setup to operation.</h2><p>CREATE shapes the system. BUILD structures the work. GROW supports the business. PUBLISH is the future step that brings a reviewed configuration into active operation.</p><button className="ns-button ns-publish-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
