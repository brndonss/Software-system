"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const contextItems = [
  ["Services", "What the business provides"],
  ["Customer needs", "Who the business helps"],
  ["Business information", "What the system knows"],
  ["Operational knowledge", "How the work happens"],
];

const growthSteps = [
  ["AEO opportunity", "A clearer question worth exploring"],
  ["Recommendation", "An idea to review"],
  ["Task", "Work to prepare"],
  ["Workflow", "A repeatable process"],
  ["Campaign", "A draft growth action"],
  ["Activity", "A visible record"],
];

export default function AeoPage() {
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

  return <main className="ns-aeo-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-aeo-hero"><div className="ns-aeo-container"><p className="ns-kicker">ANSWER ENGINE OPTIMIZATION</p><h1>Help AI understand your business.</h1><p className="ns-aeo-lede">AEO is a future product direction for organizing business information so AI-powered search and answer systems can better understand what a business does, who it serves, and how it operates.</p><div className="ns-aeo-actions"><button className="ns-button ns-aeo-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#aeo-visual" className="ns-aeo-secondary">See the model <span>↓</span></a></div><p className="ns-aeo-note"><span /> AEO discovery, rankings, citations, and integrations are not currently implemented.</p></div></section><section id="aeo-visual" className="ns-aeo-visual"><div className="ns-aeo-container"><div className="ns-aeo-visual-heading"><div><p className="ns-kicker">BUSINESS CONTEXT TO DISCOVERY</p><h2>Make the information clearer before asking it to travel further.</h2></div><p>This is a conceptual visual, not live AI-search data. It shows how future AEO work could connect business context to recommendations and the existing operating system.</p></div><div className="ns-aeo-console"><div className="ns-aeo-console-top"><span>ANSWER ENGINE OPTIMIZATION / CONCEPT VIEW</span><b>CONCEPT</b></div><div className="ns-aeo-console-body"><div className="ns-aeo-context"><small>BUSINESS CONTEXT</small><h3>What does the business do?</h3><div>{contextItems.map(([title, detail]) => <span key={title}><b>{title}</b><small>{detail}</small></span>)}</div><i aria-hidden="true">↓</i><div className="ns-aeo-structured"><small>STRUCTURED INFORMATION</small><b>Clear, useful business context</b><span>No automatic schema or publishing</span></div></div><div className="ns-aeo-discovery"><small>AI DISCOVERY</small><h3>Opportunities for clarity</h3><div><span>Search questions</span><span>Answer systems</span><span>AI assistants</span></div><i aria-hidden="true">↓</i><div className="ns-aeo-opportunity"><small>OPPORTUNITY</small><b>Clarify service information</b><span>Illustrative only · no ranking or visibility score</span></div></div></div></div></div></section><section className="ns-aeo-sections ns-aeo-container"><div className="ns-aeo-heading"><p className="ns-kicker">THE AEO DIRECTION</p><h2>Make the business understandable to AI-powered discovery.</h2><p>The current product already holds onboarding context, system configuration, customers, leads, tasks, workflows, automations, recommendations, campaign drafts, and activity. AEO is the future direction for using that context to make business information clearer.</p></div><div className="ns-aeo-grid"><article><span>01</span><h3>Start with real business context</h3><p>Services, customer needs, business information, and operational knowledge can form the foundation for future discovery work.</p></article><article><span>02</span><h3>Find opportunities for clarity</h3><p>Future AI-assisted recommendations could identify information that may need clarification or expansion. That analysis does not exist today.</p></article><article><span>03</span><h3>Turn opportunities into actions</h3><p>A future AEO opportunity could become a recommendation, task, workflow, campaign draft, and activity record.</p></article><article><span>04</span><h3>Connect discovery to the business</h3><p>The long-term goal is to connect discovery thinking with leads, campaigns, and broader operations without claiming attribution or visibility measurement.</p></article></div></section><section className="ns-aeo-system ns-aeo-container"><div className="ns-aeo-heading"><p className="ns-kicker">FROM OPPORTUNITY TO ACTIVITY</p><h2>Growth work can follow the operating system.</h2></div><div className="ns-aeo-system-grid">{growthSteps.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-aeo-compare ns-aeo-container"><div className="ns-aeo-heading"><p className="ns-kicker">SEO + AEO</p><h2>Two ways of thinking about discoverability.</h2></div><div className="ns-aeo-compare-grid"><div><small>SEO</small><h3>Traditional search discoverability.</h3><p>A concept for helping businesses improve how they can be found through traditional search. No SEO ranking or guarantee is currently provided.</p></div><div><small>AEO</small><h3>AI-powered answer discoverability.</h3><p>A concept for making business information clearer and more useful to AI-powered answer and discovery systems. No citations or visibility scores are currently provided.</p></div></div></section><section className="ns-aeo-outcome ns-aeo-container"><p className="ns-kicker">GROW WITH DISCOVERY</p><h2>Business context, made clearer for what comes next.</h2><p>Future search and answer-system data could help refine recommendations and growth work. This measurement layer is not implemented today.</p><button className="ns-button ns-aeo-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
