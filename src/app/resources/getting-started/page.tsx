"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const steps = [["01", "Describe your business"], ["02", "Build your business context"], ["03", "Organize customers and leads"], ["04", "Create tasks and follow-ups"], ["05", "Review workflows and recommendations"], ["06", "Approve useful automations"], ["07", "Track what happened in Activity"]];

export default function GettingStartedPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false);
  return <main className="ns-resource-page ns-resource-started"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero"><p className="ns-kicker">GETTING STARTED</p><h1>From business context<br />to your operating system</h1><p>Northstar starts with the way your business works, then helps organize the customers, leads, tasks, workflows, recommendations, and activity around it.</p></section><section className="ns-started-steps">{steps.map(([number, title]) => <div key={number}><span>{number}</span><h2>{title}</h2><i>→</i></div>)}</section></div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}
