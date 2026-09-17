"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const signalRows = [
  ["Customers", "Active", "Records and lifecycle"],
  ["Leads", "Needs attention", "Source and status"],
  ["Tasks", "In progress", "Owners and due dates"],
  ["Workflows", "Running", "Generated process"],
  ["Automations", "Active", "Configured action"],
];

const operatingPieces = [
  ["Customers", "Context"],
  ["Leads", "Signals"],
  ["Tasks", "Work"],
  ["Workflows", "Process"],
  ["Automations", "Action"],
  ["Activity", "History"],
];

export default function PerformancePage() {
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

  return <main className="ns-performance-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-performance-hero"><div className="ns-performance-container"><p className="ns-kicker">OPERATIONAL PERFORMANCE</p><h1>See how your business is moving.</h1><p className="ns-performance-lede">Performance is a product direction for understanding what is happening across the business system, where attention may be needed, and how the operating structure can improve over time.</p><div className="ns-performance-actions"><button className="ns-button ns-performance-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#performance-visual" className="ns-performance-secondary">See the model <span>↓</span></a></div><p className="ns-performance-note"><span /> No analytics scores, benchmarks, or predictive metrics are currently implemented.</p></div></section><section id="performance-visual" className="ns-performance-visual"><div className="ns-performance-container"><div className="ns-performance-visual-heading"><div><p className="ns-kicker">OPERATIONAL VISIBILITY</p><h2>See the work in motion, not just the end result.</h2></div><p>The current product provides structured business records, tasks, automation states, recommendations, and an activity log. This visual shows how those signals could become one operational view.</p></div><div className="ns-performance-console"><div className="ns-performance-console-top"><span>PERFORMANCE / OPERATIONAL VIEW</span><b>CONCEPT</b></div><div className="ns-performance-console-body"><div className="ns-performance-signals"><small>BUSINESS ACTIVITY</small><h3>What is happening now?</h3>{signalRows.map(([name, status, detail]) => <div key={name}><span><b>{name}</b><small>{detail}</small></span><em className={status === "Needs attention" ? "attention" : ""}>{status}</em></div>)}</div><div className="ns-performance-trail"><small>RECENT SIGNALS</small><h3>From action to activity.</h3><div><span>New lead</span><i>↓</i><span>Follow-up task</span><i>↓</i><span>Workflow</span><i>↓</i><span>Automation</span><i>↓</i><span>Activity</span></div></div></div></div></div></section><section className="ns-performance-sections ns-performance-container"><div className="ns-performance-heading"><p className="ns-kicker">FROM SIGNAL TO ATTENTION</p><h2>Useful visibility starts with the work already in the system.</h2><p>Performance is not presented here as a finished analytics product. It is the direction for connecting operational information so the business can understand what deserves attention.</p></div><div className="ns-performance-grid"><article><span>01</span><h3>See the work in motion</h3><p>Activity entries, task states, lead status, and automation states can provide a grounded view of what is happening.</p></article><article><span>02</span><h3>Understand where attention is needed</h3><p>Recommendations and operational context can eventually help surface work that may need a closer look.</p></article><article><span>03</span><h3>Connect actions to outcomes</h3><p>Lead, task, workflow, automation, and activity records create a visible operational trail without claiming outcome measurement that does not exist.</p></article><article><span>04</span><h3>Improve the operating system</h3><p>The future direction is to use operational information and recommendations to refine processes as the business changes.</p></article></div></section><section className="ns-performance-activity ns-performance-container"><div className="ns-performance-heading"><p className="ns-kicker">ONE VIEW ACROSS OPERATIONS</p><h2>Business-level visibility, not website-performance monitoring.</h2></div><div className="ns-performance-piece-grid">{operatingPieces.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-performance-future ns-performance-container"><p className="ns-kicker">THE FUTURE DIRECTION</p><h2>A clearer view of the system can lead to a better system.</h2><p>A future Performance experience could help a business compare operational signals over time, prioritize recommendations, and make improvements with more context. Those analytics and scoring capabilities are not currently implemented.</p><button className="ns-button ns-performance-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
