"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const guides = ["How to build a lead follow-up system", "How to organize customer information", "When should a business automate a task?", "How to stop leads from falling through the cracks", "How to create repeatable business workflows", "How to know what needs your attention"];

export default function GuidesPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false);
  useEffect(() => { const items = Array.from(document.querySelectorAll<HTMLElement>(".ns-resource-reveal")); const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: .12 }); items.forEach((item) => observer.observe(item)); return () => observer.disconnect(); }, []);
  return <main className="ns-resource-page ns-resource-guides"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero ns-resource-reveal"><p className="ns-kicker">GUIDES</p><h1>Run the business<br />with a clearer system</h1><p>Short, practical starting points for organizing leads, customers, tasks, workflows, and the work that needs attention.</p></section><section className="ns-resource-grid ns-resource-reveal">{guides.map((guide, index) => <article key={guide}><small>GUIDE {String(index + 1).padStart(2, "0")}</small><h2>{guide}</h2><p>A focused resource preview for building a more connected operating rhythm.</p><button type="button">Preview guide <span>↗</span></button></article>)}</section></div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}
