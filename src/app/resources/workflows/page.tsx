"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const workflows = [["New Lead Follow-up", "Lead received -> Review context -> Create follow-up -> Track activity"], ["Customer Onboarding", "Customer added -> Prepare next steps -> Create tasks -> Track progress"], ["Missed Lead Recovery", "Lead needs attention -> Review -> Follow up -> Record activity"], ["Weekly Business Review", "Review activity -> Surface priorities -> Create next actions"], ["Client Follow-up", "Customer context -> Follow-up task -> Review -> Complete"], ["Lead Qualification", "New lead -> Review details -> Determine next action"]];

export default function WorkflowsPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false);
  return <main className="ns-resource-page ns-resource-workflows"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero"><p className="ns-kicker">WORKFLOW LIBRARY</p><h1>Workflows for<br />the work that repeats.</h1><p>Explore practical workflow patterns for turning recurring business processes into clear, repeatable steps.</p></section><section className="ns-resource-grid">{workflows.map(([title, steps]) => <article key={title}><small>WORKFLOW PATTERN</small><h2>{title}</h2><p>{steps}</p><button type="button">View workflow <span>↗</span></button></article>)}</section></div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}