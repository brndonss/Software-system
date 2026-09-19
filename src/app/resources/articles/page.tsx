"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const articles = ["Why leads fall through the cracks", "From business context to business action", "When should a process become a workflow?", "Automation without losing control", "Building a better customer follow-up system", "Why business activity should live in one place"];

export default function ArticlesPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false);
  return <main className="ns-resource-page ns-resource-articles"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero"><p className="ns-kicker">ARTICLES</p><h1>Ideas for running<br />a clearer business.</h1><p>Practical thinking on leads, customers, workflows, automation, and building a more connected operating system.</p></section><section className="ns-resource-grid">{articles.map((article) => <article key={article}><small>ARTICLE PREVIEW</small><h2>{article}</h2><p>A resource preview for teams building a clearer, more connected operating system.</p></article>)}</section></div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}