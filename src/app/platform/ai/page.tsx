"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const contextItems = [
  ["Customers", "Business records"],
  ["Leads", "Opportunity flow"],
  ["Tasks", "Operational work"],
  ["Workflows", "Generated process"],
  ["Activity", "Visible history"],
];

const systemLayers = [
  ["Customers", "Context"],
  ["Leads", "Signals"],
  ["Tasks", "Work"],
  ["Workflows", "Process"],
  ["Automations", "Action"],
  ["Activity", "History"],
];

const intelligenceSteps = [
  ["Observe", "Business event"],
  ["Understand", "Useful context"],
  ["Recommend", "Next action"],
  ["Approve", "Human control"],
  ["Act", "Supported workflow"],
  ["Record", "Activity"],
];

export default function AiPage() {
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

  return <main className="ns-ai-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-ai-hero"><div className="ns-ai-container"><p className="ns-kicker">THE INTELLIGENCE LAYER</p><h1>AI that understands how your business works.</h1><p className="ns-ai-lede">AI is the intelligence layer across the business operating system: using structured context to understand what is happening, identify what may need attention, and help prepare the next action.</p><div className="ns-ai-actions"><button className="ns-button ns-ai-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#ai-visual" className="ns-ai-secondary">See the model <span>↓</span></a></div><p className="ns-ai-note"><span /> AI-assisted setup and internal planning exist today. Autonomous business management does not.</p></div></section><section id="ai-visual" className="ns-ai-visual"><div className="ns-ai-container"><div className="ns-ai-visual-heading"><div><p className="ns-kicker">CONTEXT TO RECOMMENDATION</p><h2>Intelligence becomes useful when it works with the system.</h2></div><p>The current foundation includes onboarding-driven configuration, internal action planning, constrained recommendations, and business activity. This is a static concept visual, not a live AI control panel.</p></div><div className="ns-ai-console"><div className="ns-ai-console-top"><span>AI SYSTEM / RECOMMENDATION PREVIEW</span><b>CONCEPT</b></div><div className="ns-ai-console-body"><div className="ns-ai-context"><small>BUSINESS CONTEXT</small><h3>What is happening?</h3><div>{contextItems.map(([title, detail]) => <span key={title}><b>{title}</b><small>{detail}</small></span>)}</div><i aria-hidden="true">↓</i><div className="ns-ai-understanding"><small>AI SYSTEM</small><b>Understanding context...</b><span>Internal planning signal</span></div></div><div className="ns-ai-recommendation"><small>RECOMMENDED ACTION</small><h3>Lead needs follow-up</h3><div className="ns-ai-suggestion"><span>SUGGESTED NEXT STEP</span><b>Create follow-up task</b><small>Illustrative recommendation for owner review</small></div><div className="ns-ai-control"><span><i /> OWNER REVIEW</span><b>Action stays controlled</b></div></div></div></div></div></section><section className="ns-ai-sections ns-ai-container"><div className="ns-ai-heading"><p className="ns-kicker">AI WITH BUSINESS CONTEXT</p><h2>Not a chatbot. A layer across the work.</h2><p>The vision is for AI to work with structured business information instead of answering in isolation. Today, the system uses onboarding context to help generate a business configuration and action-plan opportunities.</p></div><div className="ns-ai-grid"><article><span>01</span><h3>From information to recommendation</h3><p>A business event can be understood through its context, then surfaced as a constrained recommendation. The internal planner currently includes lead follow-up, customer reminders, and operational reporting opportunities.</p></article><article><span>02</span><h3>From recommendation to action</h3><p>Recommendations can point toward supported actions such as tasks, notifications, field updates, follow-ups, and activity records. This is not unrestricted autonomous execution.</p></article><article><span>03</span><h3>Human control where it matters</h3><p>The product direction is to assist, recommend, and prepare work while keeping important business decisions visible and controlled by the owner.</p></article><article><span>04</span><h3>Learn from ongoing operations</h3><p>Activity provides a record of actions and statuses. Self-learning agents and predictive business intelligence are not currently implemented.</p></article></div></section><section className="ns-ai-system ns-ai-container"><div className="ns-ai-heading"><p className="ns-kicker">AI ACROSS THE SYSTEM</p><h2>One intelligence layer, many operational inputs.</h2></div><div className="ns-ai-system-visual"><div className="ns-ai-system-inputs">{systemLayers.slice(0, 3).map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div><div className="ns-ai-system-core"><span>AI</span><small>CONTEXT LAYER</small></div><div className="ns-ai-system-output"><div><b>Recommendations</b><small>What to consider</small></div><div><b>Actions</b><small>What to prepare</small></div></div></div><div className="ns-ai-system-lower">{systemLayers.slice(3).map(([title, detail], index) => <div key={title}><span>{String(index + 4).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-ai-agents ns-ai-container"><div className="ns-ai-heading"><p className="ns-kicker">AI + AGENTS</p><h2>The intelligence layer can shape specialized workers.</h2><p>AI is the broader intelligence layer. Agents are specialized AI-powered workers designed around particular responsibilities. Agents remain product direction and are not fully implemented as autonomous workers today.</p></div><div className="ns-ai-comparison"><div><small>AI</small><h3>Understand the system.</h3><p>Interpret business context, identify signals, and help prepare recommendations across operations.</p></div><div><small>AGENTS</small><h3>Own a responsibility.</h3><p>Future specialized workers for sales, customers, operations, or growth, operating within clear boundaries.</p><a href="/platform/agents">Explore Agents <span>↗</span></a></div></div></section><section className="ns-ai-direction ns-ai-container"><div className="ns-ai-heading"><p className="ns-kicker">THE LONG-TERM DIRECTION</p><h2>Observe. Understand. Recommend. Approve. Act. Record.</h2><p>The intended path connects future intelligence to existing workflows, automations, and activity without claiming self-directed business management.</p></div><div className="ns-ai-direction-flow">{intelligenceSteps.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-ai-outcome ns-ai-container"><p className="ns-kicker">THE OUTCOME</p><h2>Business context in. Better next actions out.</h2><p>The long-term goal is AI that helps the business see, decide, and move through one operating system. Fully autonomous workers, unrestricted decisions, and predictive intelligence are not current capabilities.</p><button className="ns-button ns-ai-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
