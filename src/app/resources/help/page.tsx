"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const topics = ["Getting Started", "Customers", "Leads", "Tasks & Follow-ups", "Workflows", "Automations", "Activity", "Account"];

export default function HelpPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false); const [query, setQuery] = useState("");
  const visibleTopics = topics.filter((topic) => topic.toLowerCase().includes(query.toLowerCase()));
  return <main className="ns-resource-page ns-resource-help"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero"><p className="ns-kicker">HELP CENTER</p><h1>Find what you need<br />and keep moving</h1><p>Start with a product area below. This first help center is a focused guide to the parts of the system represented in the product.</p><label className="ns-help-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help topics" aria-label="Search help topics" /></label></section><section className="ns-help-grid">{visibleTopics.map((topic) => <article key={topic}><small>HELP TOPIC</small><h2>{topic}</h2><p>Explore the available product guidance for this area.</p><button type="button">Open topic <span>↗</span></button></article>)}</section>{query && !visibleTopics.length && <p className="ns-help-empty">No matching help topic yet.</p>}</div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}
