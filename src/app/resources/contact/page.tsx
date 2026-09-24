"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

export default function ContactPage() {
  const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [showAuth, setShowAuth] = useState(false); const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitted(true); }
  return <main className="ns-resource-page ns-resource-contact"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={(id) => router.push(id ? `/#${id}` : "/")} onLogin={() => setShowAuth(true)} onGetStarted={() => setShowAuth(true)} /><div className="ns-resource-container"><section className="ns-resource-hero"><p className="ns-kicker">CONTACT</p><h1>Start a conversation.</h1><p>Have a question, feedback, or want to learn more about the system? Get in touch.</p></section><form className="ns-contact-form" onSubmit={submit}><label>Name<input name="name" autoComplete="name" required /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Company<input name="company" autoComplete="organization" /></label><label>What can we help with?<textarea name="message" required /></label><button className="ns-button ns-button-accent" type="submit">Send message <span>↗</span></button>{submitted && <p role="status">Contact messaging is being set up. Thanks for your interest.</p>}</form></div>{showAuth && <AuthModal mode="create" setMode={() => undefined} onClose={() => setShowAuth(false)} />}</main>;
}