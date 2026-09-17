"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const systemPieces = [
  ["Customers", "The records and lifecycle context the business relies on."],
  ["Leads", "The path from an incoming opportunity to the next step."],
  ["Tasks", "The operational work that needs an owner and a date."],
  ["Workflows", "Repeatable structures generated around business events."],
  ["Automations", "Approved actions that reduce repetitive work."],
  ["Activity", "The visible history of what happened and what changed."],
];

export default function DesignPage() {
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

  return <main className="ns-design-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-design-hero"><div className="ns-design-container"><p className="ns-kicker">BUSINESS SYSTEM DESIGN</p><h1>Shape the system around the way the business actually works.</h1><p className="ns-design-lede">Design is a product direction for turning business needs into a clear operating structure, connecting the work your team does with the workflows and automations already in the system.</p><div className="ns-design-actions"><button className="ns-button ns-design-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a className="ns-design-secondary" href="#design-flow">Explore the model <span>↓</span></a></div><p className="ns-design-note"><span /> No visual drag-and-drop designer is currently available.</p></div></section><section id="design-flow" className="ns-design-flow ns-design-container"><div className="ns-design-heading"><p className="ns-kicker">FROM NEEDS TO OPERATION</p><h2>Design the operating structure before the work gets noisy.</h2><p>Today, onboarding and system generation already capture the business context and create a configured foundation. The broader Design experience is the direction for making those relationships clearer and easier to evolve.</p></div><div className="ns-design-sequence"><div><span>01</span><b>Business needs</b><small>What the company is trying to solve</small></div><i aria-hidden="true">↓</i><div><span>02</span><b>Operating structure</b><small>How the work should fit together</small></div><i aria-hidden="true">↓</i><div><span>03</span><b>Connected work</b><small>Customers, tasks, and workflows</small></div><i aria-hidden="true">↓</i><div><span>04</span><b>Automation rules</b><small>Where repetitive work can be reduced</small></div><i aria-hidden="true">↓</i><div className="review"><span>05</span><b>Review the system</b><small>Keep decisions with the owner</small></div><i aria-hidden="true">↓</i><div><span>06</span><b>Improve over time</b><small>Adapt as operations change</small></div></div></section><section className="ns-design-visual"><div className="ns-design-container"><div className="ns-design-visual-heading"><div><p className="ns-kicker">SYSTEM STRUCTURE</p><h2>A map of the work, not a pretend control panel.</h2></div><p>This is a presentational model of how the capability could work. The current product already generates modules and workflow templates from onboarding information; the visual design layer remains a future direction.</p></div><div className="ns-design-canvas"><div className="ns-design-canvas-top"><span>BUSINESS SYSTEM / OPERATING STRUCTURE</span><b>CONCEPT</b></div><div className="ns-design-canvas-body"><div className="ns-design-node root"><small>BUSINESS SYSTEM</small><b>How the business operates</b></div><div className="ns-design-connector one" /><div className="ns-design-node"><small>CONTEXT</small><b>Customers + Leads</b><span>Relationships and opportunity flow</span></div><div className="ns-design-connector two" /><div className="ns-design-node"><small>PROCESS</small><b>Workflow + Tasks</b><span>Repeatable work and ownership</span></div><div className="ns-design-connector three" /><div className="ns-design-node"><small>EXECUTION</small><b>Automations + Activity</b><span>Approved actions and visible results</span></div></div></div></div></section><section className="ns-design-sections ns-design-container"><div className="ns-design-section-heading"><p className="ns-kicker">THE DESIGN DIRECTION</p><h2>Four ways to make the operating structure clearer.</h2></div><div className="ns-design-grid"><article><span>01</span><h3>Start with the business</h3><p>The system should reflect the company’s niche, goals, services, struggles, and current way of working.</p></article><article><span>02</span><h3>Structure the work</h3><p>Customers, leads, tasks, and generated workflows can form the backbone of an operating structure.</p></article><article><span>03</span><h3>Connect automation</h3><p>Existing automation concepts can reduce repetitive work through recommendations, approvals, and supported actions.</p></article><article><span>04</span><h3>Improve over time</h3><p>The product direction is to let the system evolve as the business changes, without losing operational clarity.</p></article></div></section><section className="ns-design-capabilities ns-design-container"><div className="ns-design-section-heading"><p className="ns-kicker">CONNECTED CAPABILITIES</p><h2>The structure is useful because the parts already exist.</h2></div><div className="ns-design-capability-grid">{systemPieces.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><p>{detail}</p></div>)}</div></section><section className="ns-design-outcome ns-design-container"><p className="ns-kicker">THE OUTCOME</p><h2>Turn the way the business operates into a system people can understand.</h2><p>The current foundation is generated from onboarding context. The long-term Design direction is a clearer way to shape, review, and improve the relationships inside that system.</p><button className="ns-button ns-design-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
