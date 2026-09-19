"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const automations = [["Lead Follow-up", "Recommend a follow-up when a new lead needs attention."], ["Follow-up Reminder", "Surface a reminder when a follow-up is due."], ["Customer Onboarding", "Prepare repeatable next steps when a customer is added."], ["Task Reminder", "Surface tasks that need attention."], ["Lead Status Update", "Keep the next action visible as a lead moves through the process."], ["Activity Tracking", "Record important business actions in one history."]];

export default function AutomationsPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false);
  return <main className="ns-resource-page ns-resource-automations"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero"><p className="ns-kicker">AUTOMATION LIBRARY</p><h1>Automate what repeats.<br />Stay in control.</h1><p>Explore automation patterns designed to help businesses reduce repetitive work while keeping important decisions visible.</p><p className="ns-resource-control">Recommended <span>{"->"}</span> Review <span>{"->"}</span> Approve</p></section><section className="ns-resource-grid">{automations.map(([title, description]) => <article key={title}><small>RECOMMENDED AUTOMATION</small><h2>{title}</h2><p>{description}</p><button type="button">View pattern <span>↗</span></button></article>)}</section></div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}