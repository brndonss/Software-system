"use client";

import { useState } from "react";
import { AuthModal, PublicNavigation } from "@/app/page";

const systemParts = [
  ["Customers", "Keep customer records, contact details, and lifecycle status in one place."],
  ["Leads", "Track inbound opportunities by source, status, and next step."],
  ["Tasks", "Turn operational work into clear assignments with due dates."],
  ["Workflows", "Use generated workflow templates for repeatable business events."],
  ["Automations", "Review recommended automations and choose what to enable."],
  ["Activity", "Keep a visible history of actions and outcomes across the workspace."],
];

export default function BusinessSystemPage() {
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
    window.location.href = id ? `/#${id}` : "/";
  }

  return <main className="ns-platform-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-platform-hero"><div className="ns-platform-container"><p className="ns-kicker">BUSINESS SYSTEM</p><h1>One system for the work that keeps your business moving.</h1><p className="ns-platform-lede">Give the system a clear picture of how your business works. It uses that context to configure a workspace around your customers, leads, tasks, workflows, automations, and activity.</p><div className="ns-platform-actions"><button className="ns-button ns-platform-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a className="ns-platform-secondary" href="/#product">See the product <span>↓</span></a></div></div></section><section className="ns-platform-flow ns-platform-container"><div className="ns-platform-section-heading"><p className="ns-kicker">FROM CONTEXT TO WORKSPACE</p><h2>Start with how the business actually works.</h2></div><div className="ns-platform-steps"><article><span>01</span><h3>Share the context</h3><p>Onboarding captures the business niche, size, services, software, goals, struggles, repetitive work, and desired automations.</p></article><article><span>02</span><h3>Configure the system</h3><p>The system builder analyzes that information and generates a reusable workspace configuration with modules, fields, widgets, and workflow templates.</p></article><article><span>03</span><h3>Work from one view</h3><p>The completed workspace brings the configured parts together so the team can see the work and decide what to do next.</p></article></div></section><section className="ns-platform-visual"><div className="ns-platform-container"><div className="ns-platform-visual-copy"><p className="ns-kicker">THE GENERATED WORKSPACE</p><h2>A structure that reflects the business.</h2><p>The system is configured from the information provided during onboarding. Enabled modules and dashboard widgets become the foundation for daily operations.</p></div><div className="ns-platform-window"><div className="ns-platform-window-bar"><span /><span /><span /><b>workspace / active configuration</b></div><div className="ns-platform-window-body"><aside><i /><strong>Workspace</strong><span className="active">Overview</span><span>Customers</span><span>Leads</span><span>Tasks</span><span>Automations</span></aside><div><small>PERSONALIZED WORKSPACE</small><h3>Built around the way you work.</h3><div className="ns-platform-window-metrics"><span><b>Customers</b>Records and status</span><span><b>Leads</b>Pipeline and source</span><span><b>Tasks</b>Assignments and dates</span></div><div className="ns-platform-window-line"><i /><i /><i /><i /><i /><i /><i /></div></div></div></div></div></section><section className="ns-platform-parts ns-platform-container"><div className="ns-platform-section-heading"><p className="ns-kicker">WHAT FITS INSIDE</p><h2>Connected parts, one operating picture.</h2></div><div className="ns-platform-parts-grid">{systemParts.map(([title, detail], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{detail}</p></article>)}</div></section><section className="ns-platform-outcome ns-platform-container"><p className="ns-kicker">THE OUTCOME</p><h2>Less time fitting the business to a tool. More time moving it forward.</h2><p>The result is a configured starting point for the work your team already does, with recommendations and repeatable processes surfaced from the context you provide.</p><button className="ns-button ns-platform-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
