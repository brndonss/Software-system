"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

export default function WhatsNewPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false);
  return <main className="ns-resource-page ns-resource-whats-new"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero"><p className="ns-kicker">WHAT&apos;S NEW</p><h1>The system<br />keeps getting better.</h1><p>Follow improvements across the business system, workflows, automations, resources, and product experience.</p></section><section className="ns-resource-updates"><div><small>PRODUCT</small><p>Product updates will appear here as the system evolves.</p></div><div><small>RESOURCES</small><p>New guides, workflow patterns, and practical tools will be collected here.</p></div><div><small>EXPERIENCE</small><p>Improvements to the product experience will be shared here as they take shape.</p></div></section></div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}