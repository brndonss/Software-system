"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const builderFlow = ["Business context", "Customers and leads", "Next action", "Task / workflow", "Recommended automation", "Approval", "Activity/result"];

export default function BuildersSolutionPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".ns-builders-reveal"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -8%" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function openAuth(mode: "sign-in" | "create") { setAuthMode(mode); setShowAuth(true); setMenuOpen(false); setProductMenuOpen(false); }
  function navigateToLanding(id?: string) { router.push(id ? `/#${id}` : "/"); }

  return <main className="ns-builders-page">
    <PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} />
    <section className="ns-builders-hero"><div className="ns-builders-container ns-builders-hero-grid ns-builders-reveal"><div><p className="ns-kicker">FOR BUILDERS</p><h1>Build the business<br />behind the product</h1><p className="ns-builders-lede">Turn business context into an organized operating system for customers, leads, tasks, workflows, recommendations, and activity.</p><div className="ns-builders-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-builders-secondary" href="#builder-system">Explore the system <span>↓</span></a></div></div><BuilderSystemVisual /></div></section>

    <section className="ns-builders-problem ns-builders-reveal"><div className="ns-builders-container ns-builders-narrow"><p className="ns-kicker">FROM PRODUCT BUILDING TO OPERATIONS</p><h2>The product is not the whole business</h2><p>Customers, leads, decisions, tasks, follow-ups, and activity still need a structure around them. A business system helps builders organize that work without turning the product into an IDE or autonomous coding tool.</p></div></section>

    <section id="builder-system" className="ns-builders-section ns-builders-reveal"><div className="ns-builders-container"><div className="ns-builders-section-heading"><p className="ns-kicker">BUSINESS CONTEXT TO OPERATIONS</p><h2>Build the operating structure around the work</h2><p>AI-assisted planning can help translate context into recommendations and reviewable next actions.</p></div><div className="ns-builders-flow">{builderFlow.map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < builderFlow.length - 1 && <i>→</i>}</div>)}</div></div></section>

    <section className="ns-builders-context ns-builders-reveal"><div className="ns-builders-container ns-builders-split"><div><p className="ns-kicker">CUSTOMERS AND LEADS</p><h2>Keep the business context close to the build</h2><p>Customer and lead information can stay connected with tasks, follow-ups, workflows, and recent activity so operational decisions have a visible history.</p></div><BuilderContextPanel /></div></section>

    <section className="ns-builders-planning ns-builders-reveal"><div className="ns-builders-container ns-builders-split ns-builders-split-reverse"><BuilderRecommendation /><div><p className="ns-kicker">AI-ASSISTED PLANNING</p><h2>Make the next action easier to see</h2><p>Recommendations and workflow suggestions can help organize the work. The team reviews the idea and keeps control of the decision.</p></div></div></section>

    <section className="ns-builders-automation ns-builders-reveal"><div className="ns-builders-container"><div className="ns-builders-section-heading"><p className="ns-kicker">RECOMMENDED AUTOMATIONS</p><h2>Reduce coordination without removing approval</h2></div><div className="ns-builders-approval"><div><small>AUTOMATION RECOMMENDATION</small><strong>New lead follow-up</strong><span>Trigger: new lead received</span></div><div><small>SUGGESTED ACTION</small><strong>Prepare follow-up task</strong><span>Approval required before activation</span></div><button type="button">Review recommendation <span>↗</span></button></div></div></section>

    <section className="ns-builders-activity ns-builders-reveal"><div className="ns-builders-container ns-builders-split"><div><p className="ns-kicker">BUSINESS ACTIVITY</p><h2>See what the system is helping organize</h2><p>Activity gives builders a clearer record of recent actions across customers, leads, tasks, workflows, and recommendations.</p></div><BuilderActivity /></div></section>

    <section className="ns-builders-system ns-builders-reveal"><div className="ns-builders-container"><div className="ns-builders-section-heading"><p className="ns-kicker">ONE OPERATING SYSTEM</p><h2>Build once, organize the work around it</h2></div><div className="ns-builders-comparison"><div><p>SCATTERED</p><h3>Operational pieces</h3><span>Customer details</span><span>Lead information</span><span>Notes</span><span>Tasks</span><span>Follow-ups</span></div><div className="is-after"><p>CONNECTED</p><h3>Business system</h3><span>Customers</span><span>Leads</span><span>Tasks</span><span>Workflows</span><span>Automations</span><span>Activity</span></div></div></div></section>

    <section className="ns-builders-final ns-builders-reveal"><div className="ns-builders-container ns-builders-narrow"><p className="ns-kicker">BUILD THE BUSINESS BEHIND THE PRODUCT</p><h2>Spend less time coordinating the operation</h2><p>Give your team a connected place to understand context, prepare work, and review what happens next.</p><div className="ns-builders-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-builders-secondary" href="/platform/system">Explore platform <span>↗</span></a></div></div></section>

    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
  </main>;
}

function BuilderSystemVisual() { return <div className="ns-builders-visual"><div className="ns-builders-visual-line" /><div className="ns-builders-visual-card visual-context"><small>BUSINESS CONTEXT</small><strong>8-person landscaping company</strong><span>Needs and priorities captured</span></div><div className="ns-builders-visual-card visual-customer"><small>CUSTOMERS / LEADS</small><strong>18 open leads</strong><span>Context connected</span></div><div className="ns-builders-visual-card visual-action"><small>NEXT ACTION</small><strong>Prepare lead follow-up</strong><span>Recommendation</span></div><div className="ns-builders-visual-card visual-workflow"><small>TASK / WORKFLOW</small><strong>Discovery process</strong><span>Ready for review</span></div><div className="ns-builders-visual-card visual-result"><small>ACTIVITY / RESULT</small><strong>System history updated</strong><span>Conceptual product preview</span></div><div className="ns-builders-visual-caption"><i /> BUSINESS SYSTEM / BUILDER VIEW</div></div>; }
function BuilderContextPanel() { return <div className="ns-builders-panel"><div className="ns-builders-panel-top"><span>BUSINESS SYSTEM</span><b>CONNECTED</b></div><h3>Colorado Landscaping</h3><p>Operating context</p><div><small>CUSTOMERS</small><strong>126 active records</strong></div><div><small>LEADS</small><strong>18 open opportunities</strong></div><div><small>NEXT WORK</small><strong>Prepare follow-up task</strong></div><div><small>ACTIVITY</small><span>System configuration reviewed</span></div></div>; }
function BuilderRecommendation() { return <div className="ns-builders-recommendation"><div className="ns-builders-panel-top"><span>RECOMMENDATION</span><b>REVIEW</b></div><h3>Prepare lead follow-up</h3><div><small>REASON</small><p>New customer context needs a next action</p></div><div><small>SUGGESTED WORK</small><p>Create task and prepare workflow</p></div><button type="button">Review recommendation <span>↗</span></button></div>; }
function BuilderActivity() { return <div className="ns-builders-activity-feed"><div className="ns-builders-panel-top"><span>TODAY</span><b>ACTIVITY</b></div>{[["09:42", "Customer context captured"], ["10:18", "Lead follow-up recommended"], ["11:06", "Task prepared for review"], ["12:34", "Workflow recommendation reviewed"], ["02:10", "Activity recorded"]].map(([time, action]) => <div key={time}><time>{time}</time><span>{action}</span></div>)}</div>; }
