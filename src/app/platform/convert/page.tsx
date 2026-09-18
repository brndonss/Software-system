"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const conversionSteps = [
  ["Lead", "Business opportunity"],
  ["Follow-up", "Next conversation"],
  ["Task", "Owned work"],
  ["Workflow", "Repeatable process"],
  ["Automation", "Configured action"],
  ["Activity", "Visible history"],
];

const operatingPieces = [
  ["Leads", "Source + status"],
  ["Customers", "Business context"],
  ["Tasks", "Owners + due dates"],
  ["Follow-ups", "Scheduled next steps"],
  ["Workflows", "Generated process"],
  ["Activity", "Operational record"],
];

export default function ConvertPage() {
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

  return <main className="ns-convert-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-convert-hero"><div className="ns-convert-container"><p className="ns-kicker">BUSINESS CONVERSION</p><h1>Turn opportunity into action.</h1><p className="ns-convert-lede">Convert is a product direction for helping a business move opportunities forward through organized follow-up, tasks, workflows, automations, and visible activity.</p><div className="ns-convert-actions"><button className="ns-button ns-convert-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#convert-visual" className="ns-convert-secondary">See the model <span>↓</span></a></div><p className="ns-convert-note"><span /> No conversion analytics, scoring, forecasting, or automated closing is currently implemented.</p></div></section><section id="convert-visual" className="ns-convert-visual"><div className="ns-convert-container"><div className="ns-convert-visual-heading"><div><p className="ns-kicker">FROM LEAD TO ACTIVITY</p><h2>Keep the next step connected to the opportunity.</h2></div><p>The current product supports lead records, statuses, sources, follow-ups, tasks, generated workflows, automation states, and activity logging. This visual shows how those pieces can form an operational trail.</p></div><div className="ns-convert-console"><div className="ns-convert-console-top"><span>CONVERSION WORKFLOW / ILLUSTRATIVE PREVIEW</span><b>CONCEPT</b></div><div className="ns-convert-console-body"><div className="ns-convert-lead"><small>NEW LEAD</small><h3>Illustrative Company</h3><span className="ns-convert-status">Status: New</span><i aria-hidden="true">↓</i><div className="ns-convert-step-card"><small>NEXT ACTION</small><b>Follow up with lead</b><span>Organized next step</span></div></div><div className="ns-convert-trail"><small>OPERATIONAL TRAIL</small><h3>Work moves forward.</h3><div>{conversionSteps.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></div></div></div></div></section><section className="ns-convert-sections ns-convert-container"><div className="ns-convert-heading"><p className="ns-kicker">THE CONVERT DIRECTION</p><h2>Business conversion is the work around the lead.</h2><p>Convert is not a website visitor-to-percentage dashboard. The long-term concept is to connect lead context with the operational work required to move an opportunity forward.</p></div><div className="ns-convert-grid"><article><span>01</span><h3>Capture the opportunity</h3><p>Leads already have names, sources, statuses, notes, and created records. They provide a real starting point for organized opportunity work.</p></article><article><span>02</span><h3>Know what happens next</h3><p>Follow-ups can relate to a lead or customer and carry scheduled statuses. Tasks can hold an owner and due date for the work that follows.</p></article><article><span>03</span><h3>Turn follow-up into a system</h3><p>Generated workflows and automation recommendations can connect repeatable lead follow-up to tasks and configured actions.</p></article><article><span>04</span><h3>Keep progress visible</h3><p>Activity records actions and statuses, creating a visible operational history without claiming outcome measurement.</p></article></div></section><section className="ns-convert-system ns-convert-container"><div className="ns-convert-heading"><p className="ns-kicker">ONE OPERATING PICTURE</p><h2>Conversion fits inside the broader system.</h2></div><div className="ns-convert-piece-grid">{operatingPieces.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-convert-difference ns-convert-container"><div className="ns-convert-heading"><p className="ns-kicker">NOT WEBSITE CONVERSION</p><h2>Lead + context + follow-up + work + history.</h2><p>The intended product direction is not A/B testing, funnel analytics, revenue attribution, or automatic acquisition. It is a clearer operating path from a new lead to the work your team chooses to do next.</p></div><div className="ns-convert-flow"><div><span>Lead</span><i>+</i><span>Business context</span><i>+</i><span>Tasks</span><i>+</i><span>Workflows</span><i>+</i><span>Activity</span></div></div></section><section className="ns-convert-future ns-convert-container"><p className="ns-kicker">FUTURE PRODUCT DIRECTION</p><h2>Smarter next actions, with people still in the loop.</h2><p>Future Agents and AI-assisted recommendations could help identify and prepare appropriate next actions. Autonomous closing, predictive conversion, and sales conversations are not currently implemented.</p><button className="ns-button ns-convert-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
