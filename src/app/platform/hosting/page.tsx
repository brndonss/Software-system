"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const workspaceLayers = [
  ["Customers", "Business context"],
  ["Tasks", "Assigned work"],
  ["Workflows", "Repeatable process"],
  ["Automations", "Approved actions"],
  ["Agents", "Future intelligence"],
];

const operations = [
  ["Workspace", "Available"],
  ["Business system", "Connected"],
  ["Workflows", "Ready"],
  ["Activity", "Visible"],
];

export default function HostingPage() {
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

  return <main className="ns-hosting-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-hosting-hero"><div className="ns-hosting-container"><p className="ns-kicker">THE INFRASTRUCTURE LAYER</p><h1>Your business system, available when the business needs it.</h1><p className="ns-hosting-lede">Hosting is a product direction for keeping a business workspace available through the hosted application, without asking the owner to operate deployment infrastructure just to use the system.</p><div className="ns-hosting-actions"><button className="ns-button ns-hosting-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#hosting-model" className="ns-hosting-secondary">See the model <span>↓</span></a></div><p className="ns-hosting-note"><span /> The application currently runs on a Next.js and Supabase-based stack.</p></div></section><section id="hosting-model" className="ns-hosting-model ns-hosting-container"><div className="ns-hosting-heading"><p className="ns-kicker">FROM BUSINESS TO OPERATIONS</p><h2>Infrastructure should support the system, not become another system to manage.</h2><p>The current product is a hosted Next.js application connected to Supabase services. The broader Hosting concept is about making that foundation feel simple and dependable for the business using it.</p></div><div className="ns-hosting-pipeline"><div><span>01</span><b>Business</b><small>The work and context that matter</small></div><i aria-hidden="true">↓</i><div><span>02</span><b>Business workspace</b><small>The public application experience</small></div><i aria-hidden="true">↓</i><div className="layer"><span>03</span><b>System infrastructure</b><small>Existing third-party application services</small></div><i aria-hidden="true">↓</i><div><span>04</span><b>Ongoing operations</b><small>Customers, tasks, workflows, and activity</small></div></div></section><section className="ns-hosting-visual"><div className="ns-hosting-container"><div className="ns-hosting-visual-heading"><div><p className="ns-kicker">THE WORKSPACE LAYER</p><h2>One hosted application for the work that keeps moving.</h2></div><p>This is a static product visual, not infrastructure monitoring. It represents the intended relationship between a business workspace and the operating capabilities already present in the product.</p></div><div className="ns-hosting-console"><div className="ns-hosting-console-top"><span>BUSINESS WORKSPACE / SYSTEM LAYER</span><b>CONCEPT</b></div><div className="ns-hosting-console-body"><div className="ns-hosting-workspace"><small>BUSINESS WORKSPACE</small><h3>Operations at a glance.</h3><div className="ns-hosting-status-grid">{operations.map(([name, status]) => <div key={name}><span>{name}</span><b>{status}</b></div>)}</div></div><div className="ns-hosting-stack"><small>SYSTEM LAYER</small>{workspaceLayers.map(([name, detail], index) => <div key={name}><span>{String(index + 1).padStart(2, "0")}</span><b>{name}</b><small>{detail}</small></div>)}</div></div></div></div></section><section className="ns-hosting-sections ns-hosting-container"><div className="ns-hosting-heading"><p className="ns-kicker">THE HOSTING DIRECTION</p><h2>Infrastructure that stays out of the way.</h2></div><div className="ns-hosting-grid"><article><span>01</span><h3>Your system, available in one workspace</h3><p>The hosted application gives the business one place to reach its configured workspace, rather than requiring the owner to assemble and operate the underlying application environment.</p></article><article><span>02</span><h3>Infrastructure without the complexity</h3><p>The current foundation uses Next.js and Supabase services. Hosting as a product idea means keeping that underlying complexity away from the daily business experience.</p></article><article><span>03</span><h3>Built around ongoing operations</h3><p>The workspace connects existing concepts such as Customers, Leads, Tasks, Workflows, Automations, and Activity into one operating context.</p></article><article><span>04</span><h3>Ready for an intelligent system</h3><p>Agents are a future product direction. The goal is for future capabilities to operate through the same hosted workspace without implying that agent infrastructure exists today.</p></article></div></section><section className="ns-hosting-clarity ns-hosting-container"><div className="ns-hosting-heading"><p className="ns-kicker">WHAT THIS IS NOT</p><h2>Not a cloud provider. Not another infrastructure dashboard.</h2><p>This page does not claim owned servers, a global network, CDN, uptime target, scaling guarantee, backup guarantee, or security certification. It describes a product direction built on the application and third-party services already in use.</p></div></section><section className="ns-hosting-outcome ns-hosting-container"><p className="ns-kicker">THE OUTCOME</p><h2>The business operates. The infrastructure supports it quietly.</h2><p>The long-term goal is a hosted business system that makes the operational layer easier to use without turning deployment and infrastructure management into the owner’s job.</p><button className="ns-button ns-hosting-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
