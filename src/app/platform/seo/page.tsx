"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const opportunityDetails = [
  ["Topic", "Customer follow-up software"],
  ["Intent", "Business operations"],
  ["Status", "Opportunity identified"],
  ["Next step", "Review growth recommendation"],
];

const growthSystem = [
  ["Business context", "What the company knows"],
  ["Search opportunity", "What may be worth exploring"],
  ["Recommendation", "What to consider next"],
  ["Task", "Work to prepare"],
  ["Campaign", "Draft growth action"],
  ["Activity", "Visible history"],
];

export default function SeoPage() {
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

  return <main className="ns-seo-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-seo-hero"><div className="ns-seo-container"><p className="ns-kicker">SEARCH AS A BUSINESS SYSTEM DIRECTION</p><h1>Turn business context into search opportunity.</h1><p className="ns-seo-lede">SEO is a future product direction for connecting what a business knows about its customers, services, market, and operations with opportunities worth exploring in search.</p><div className="ns-seo-actions"><button className="ns-button ns-seo-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#seo-visual" className="ns-seo-secondary">See the model <span>↓</span></a></div><p className="ns-seo-note"><span /> SEO research, rankings, integrations, and publishing are not currently implemented.</p></div></section><section id="seo-visual" className="ns-seo-visual"><div className="ns-seo-container"><div className="ns-seo-visual-heading"><div><p className="ns-kicker">CONCEPTUAL OPPORTUNITY VIEW</p><h2>Search should start with what the business understands.</h2></div><p>This is a static concept visual, not live SEO analytics. It shows how future search direction could connect to existing recommendations, tasks, campaign drafts, and activity.</p></div><div className="ns-seo-console"><div className="ns-seo-console-top"><span>SEARCH OPPORTUNITIES / BUSINESS CONTEXT</span><b>CONCEPT</b></div><div className="ns-seo-console-body"><div className="ns-seo-context"><small>BUSINESS CONTEXT</small><h3>Services + customer needs</h3><div><span>Customer follow-up</span><span>Operational clarity</span><span>Business services</span></div><i aria-hidden="true">↓</i><div className="ns-seo-context-box"><small>SEARCH OPPORTUNITY</small><b>Customer follow-up software</b><span>Illustrative topic only · no live search data</span></div></div><div className="ns-seo-opportunity"><small>OPPORTUNITY</small>{opportunityDetails.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div></div></div></div></section><section className="ns-seo-sections ns-seo-container"><div className="ns-seo-heading"><p className="ns-kicker">THE SEO DIRECTION</p><h2>Connect growth thinking to the operating system.</h2><p>The current product has onboarding context, recommendations, campaign drafts, tasks, workflows, automations, and activity. SEO is the future direction for connecting those pieces to search opportunities without pretending search measurement already exists.</p></div><div className="ns-seo-grid"><article><span>01</span><h3>Start with business context</h3><p>Use what the business knows about its products, services, customers, market, and goals as the starting point for future opportunity discovery.</p></article><article><span>02</span><h3>Find opportunities worth exploring</h3><p>AI-assisted recommendations could eventually identify areas to investigate. Automated keyword research and ranking data are not currently available.</p></article><article><span>03</span><h3>Turn insight into work</h3><p>A future opportunity could become a recommendation, task, workflow, campaign draft, and visible activity trail.</p></article><article><span>04</span><h3>Connect search to growth</h3><p>The long-term direction is to connect search thinking with leads, campaign drafts, and broader business operations without claiming attribution.</p></article></div></section><section className="ns-seo-system ns-seo-container"><div className="ns-seo-heading"><p className="ns-kicker">FROM OPPORTUNITY TO ACTIVITY</p><h2>Growth work can follow the same operating path.</h2></div><div className="ns-seo-system-grid">{growthSystem.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-seo-difference ns-seo-container"><div className="ns-seo-heading"><p className="ns-kicker">NOT A WEBSITE SEO TOOL</p><h2>Business context + AI assistance + search opportunity + operational work.</h2><p>The vision is not simply “edit a page and optimize it.” It is a business operating system that could help a company connect what it knows, what it wants to explore, and what the team needs to do next.</p></div></section><section className="ns-seo-outcome ns-seo-container"><p className="ns-kicker">IMPROVE OVER TIME</p><h2>Make growth work more connected, one useful signal at a time.</h2><p>Future search data could refine recommendations and operational decisions. That measurement layer is not implemented today.</p><button className="ns-button ns-seo-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
