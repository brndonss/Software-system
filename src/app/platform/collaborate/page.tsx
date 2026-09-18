"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const systemPieces = [
  ["Customers", "Shared context"],
  ["Leads", "Opportunity flow"],
  ["Tasks", "Ownership + due dates"],
  ["Workflows", "Repeatable process"],
  ["Automations", "Configured actions"],
  ["Activity", "Visible history"],
];

export default function CollaboratePage() {
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

  return <main className="ns-collaborate-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-collaborate-hero"><div className="ns-collaborate-container"><p className="ns-kicker">COLLABORATION AROUND THE WORK</p><h1>Keep the whole business on the same page.</h1><p className="ns-collaborate-lede">Collaborate is a product direction for helping teams work together inside the same business system, with shared context around customers, leads, tasks, workflows, automations, and activity.</p><div className="ns-collaborate-actions"><button className="ns-button ns-collaborate-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#collaborate-flow" className="ns-collaborate-secondary">See the model <span>↓</span></a></div><p className="ns-collaborate-note"><span /> Today: structured work, assignments, due dates, and activity. Team collaboration features are future direction.</p></div></section><section id="collaborate-flow" className="ns-collaborate-visual"><div className="ns-collaborate-container"><div className="ns-collaborate-visual-heading"><div><p className="ns-kicker">SHARED OPERATIONAL CONTEXT</p><h2>Work and context can live together.</h2></div><p>The current system already represents business records, tasks, follow-ups, workflow templates, automation states, and activity. This concept connects them around the people responsible for the next step.</p></div><div className="ns-collaborate-console"><div className="ns-collaborate-console-top"><span>SHARED BUSINESS SYSTEM / WORKFLOW PREVIEW</span><b>CONCEPT</b></div><div className="ns-collaborate-console-body"><div className="ns-collaborate-workflow"><small>ILLUSTRATIVE EXAMPLE</small><h3>New lead / Acme Company</h3><div className="ns-collaborate-steps"><div><span>01</span><b>New lead</b><small>Business context captured</small></div><i>↓</i><div><span>02</span><b>Assigned task</b><small>Prepare follow-up · Due date set</small></div><i>↓</i><div><span>03</span><b>Workflow</b><small>Customer follow-up template</small></div><i>↓</i><div><span>04</span><b>Activity</b><small>Task created · Lead updated</small></div></div></div><aside><small>SHARED SYSTEM</small>{systemPieces.slice(0, 4).map(([title, detail]) => <div key={title}><b>{title}</b><span>{detail}</span></div>)}</aside></div></div></div></section><section className="ns-collaborate-sections ns-collaborate-container"><div className="ns-collaborate-heading"><p className="ns-kicker">THE COLLABORATION DIRECTION</p><h2>Coordination around business operations, not another team chat.</h2><p>The goal is to reduce the work scattered across messages, spreadsheets, disconnected tools, and individual memory by giving the team one operating picture.</p></div><div className="ns-collaborate-grid"><article><span>01</span><h3>Work from shared context</h3><p>Customers, leads, tasks, and operational information can give the team a common place to understand what is happening.</p></article><article><span>02</span><h3>Know who owns the next step</h3><p>Tasks already support an assignee field and due dates. Follow-ups can relate to leads or customers and carry scheduled status.</p></article><article><span>03</span><h3>Connect people to workflows</h3><p>Generated workflow templates and automation states provide a foundation for connecting responsibility to repeatable operational work.</p></article><article><span>04</span><h3>Keep progress visible</h3><p>The existing Activity capability records actions and statuses so the team can understand what has happened across the system.</p></article></div></section><section className="ns-collaborate-system ns-collaborate-container"><div className="ns-collaborate-heading"><p className="ns-kicker">ONE SHARED OPERATING PICTURE</p><h2>People + context + work + history.</h2></div><div className="ns-collaborate-piece-grid">{systemPieces.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-collaborate-future ns-collaborate-container"><p className="ns-kicker">FUTURE PRODUCT DIRECTION</p><h2>Deeper coordination can come later.</h2><p>Comments, mentions, notifications, richer permissions, approval chains, shared inboxes, and real-time collaboration are not currently implemented. They are possible future layers, not current product capabilities.</p><button className="ns-button ns-collaborate-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
