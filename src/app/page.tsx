"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BusinessSystemDemo from "./components/BusinessSystemDemo";

const navItems = ["Solutions", "Pricing", "Resources"];
const workflowSteps = [{ label: "Business context", detail: "Northstar starts with the way your business actually works.", icon: "01" }, { label: "AI understands", detail: "Your context becomes a clear operating picture.", icon: "02" }, { label: "Next action", detail: "The most useful next step is surfaced with its context.", icon: "03" }, { label: "Workflow and task", detail: "The work is organized into an actionable process.", icon: "04" }, { label: "Automation", detail: "Repetitive work is prepared for your approval.", icon: "05" }, { label: "Activity and result", detail: "Progress stays visible as the business moves.", icon: "06" }];
type ProductMenuItem = { title: string; target?: string; route?: string; comingSoon: boolean };
const productMenuGroups: { label: string; items: ProductMenuItem[] }[] = [{ label: "CREATE", items: [{ title: "AI", route: "/platform/ai", comingSoon: false }, { title: "Agents", route: "/platform/agents", comingSoon: false }, { title: "Design", route: "/platform/design", comingSoon: false }, { title: "External Agents", route: "/platform/external-agents", comingSoon: false }] }, { label: "BUILD", items: [{ title: "CMS", route: "/platform/cms", comingSoon: false }, { title: "Hosting", route: "/platform/hosting", comingSoon: false }, { title: "Performance", route: "/platform/performance", comingSoon: false }, { title: "Collaborate", route: "/platform/collaborate", comingSoon: false }] }, { label: "GROW", items: [{ title: "SEO", route: "/platform/seo", comingSoon: false }, { title: "AEO", route: "/platform/aeo", comingSoon: false }, { title: "Convert", route: "/platform/convert", comingSoon: false }, { title: "Publish", route: "/platform/publish", comingSoon: false }] }];
type SolutionsMenuItem = { title: string; target?: string };
const solutionsMenuGroups: { label: string; items: SolutionsMenuItem[] }[] = [{ label: "CREATORS", items: [{ title: "Designers", target: "solutions" }, { title: "Agencies", target: "solutions" }] }, { label: "MARKETING", items: [{ title: "Marketers", target: "solutions" }, { title: "Growth", target: "solutions" }] }, { label: "CODE", items: [{ title: "Builders", target: "solutions" }, { title: "Engineers", target: "solutions" }] }, { label: "BUSINESS", items: [{ title: "Site Teams", target: "solutions" }, { title: "Founders", target: "solutions" }] }];

export default function Home() {
  const [showAuth, setShowAuth] = useState(false); const [authMode, setAuthMode] = useState<"sign-in" | "create">("create"); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [solutionsMenuOpen, setSolutionsMenuOpen] = useState(false);
  useEffect(() => { function closeMenus(event: MouseEvent) { const target = event.target as HTMLElement; if (!target.closest(".ns-product-nav")) setProductMenuOpen(false); if (!target.closest(".ns-solutions-nav")) setSolutionsMenuOpen(false); } function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") { setProductMenuOpen(false); setSolutionsMenuOpen(false); } } document.addEventListener("click", closeMenus); document.addEventListener("keydown", closeOnEscape); return () => { document.removeEventListener("click", closeMenus); document.removeEventListener("keydown", closeOnEscape); }; }, []);
  useEffect(() => { const sections = Array.from(document.querySelectorAll<HTMLElement>(".ns-scroll-reveal")); if (!sections.length) return; sections.forEach((section) => section.classList.add("ns-reveal-ready")); const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }); }, { threshold: 0.14, rootMargin: "0px 0px -8%" }); sections.forEach((section) => observer.observe(section)); return () => { observer.disconnect(); sections.forEach((section) => section.classList.remove("ns-reveal-ready", "is-visible")); }; }, []);
  function openAuth(mode: "sign-in" | "create") { setAuthMode(mode); setShowAuth(true); setMenuOpen(false); setProductMenuOpen(false); setSolutionsMenuOpen(false); }
  function goTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); setProductMenuOpen(false); setSolutionsMenuOpen(false); }
  function navigateTo(item: string) { const sectionIds: Record<string, string> = { Product: "product", Solutions: "solutions", "How It Works": "how-it-works", Resources: "product" }; goTo(sectionIds[item] ?? "top"); }
  return <main className="ns-landing">
    <PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} solutionsMenuOpen={solutionsMenuOpen} setSolutionsMenuOpen={setSolutionsMenuOpen} onNavigate={goTo} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} />

    <section id="top" className="ns-hero ns-container"><div className="ns-hero-copy"><h1><span>One system</span><span>Every part of</span><span>your business</span></h1><div className="ns-hero-actions"><button className="ns-button ns-button-accent" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><button className="ns-button ns-download-button" type="button" aria-disabled="true" title="App download destination coming soon">Download app <span>↓</span></button></div></div><div className="ns-hero-demo"><BusinessSystemDemo /></div></section>
    <ProductDemoVideo />

    <section id="how-it-works" className="ns-section ns-container ns-scroll-reveal"><div className="ns-section-intro ns-intro-wide"><p className="ns-kicker">HOW IT WORKS</p><h2>From business context to useful work.</h2><p>Northstar turns what your business knows into the next clear action.</p></div><div className="ns-story-flow">{workflowSteps.map((step) => <div className="ns-story-step" key={step.label}><span>{step.icon}</span><h3>{step.label}</h3><p>{step.detail}</p></div>)}</div></section>

    <section className="ns-final-cta ns-container ns-scroll-reveal"><p className="ns-kicker">START WITH YOUR BUSINESS</p><h2>Your business is unique.<br />Your software should be too.</h2><p>Tell Northstar how your business works. We&apos;ll help you build the system around it.</p><button className="ns-button ns-button-accent" onClick={() => openAuth("create")}>Build My Business System <span>↗</span></button></section>
    <footer className="ns-footer ns-container"><div className="ns-footer-brand"><button className="ns-logo" onClick={() => goTo("top")}><span>N</span><b>NORTHSTAR</b></button><p>AI BUSINESS OPERATING SYSTEM</p></div><div className="ns-footer-links"><div><b>Product</b><button onClick={() => goTo("how-it-works")}>How it works</button><button onClick={() => goTo("how-it-works")}>Automations</button><button onClick={() => goTo("how-it-works")}>AI</button><button>Security</button></div><div><b>Company</b><button>About</button><button>Contact</button></div><div><b>Legal</b><button>Privacy</button><button>Terms</button></div></div><small>© 2026 Northstar Systems</small></footer>
    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
  </main>;
}

export function PublicNavigation({ menuOpen, setMenuOpen, productMenuOpen, setProductMenuOpen, solutionsMenuOpen = false, setSolutionsMenuOpen, onNavigate, onLogin, onGetStarted }: { menuOpen: boolean; setMenuOpen: (open: boolean) => void; productMenuOpen: boolean; setProductMenuOpen: (open: boolean) => void; solutionsMenuOpen?: boolean; setSolutionsMenuOpen?: (open: boolean) => void; onNavigate: (id: string) => void; onLogin: () => void; onGetStarted: () => void }) {
  function toggleSolutions() { setProductMenuOpen(false); setSolutionsMenuOpen?.(!solutionsMenuOpen); }
  return <header className={`ns-header ${menuOpen ? "is-open" : ""}`}><Link className="ns-logo" href="/" aria-label="Home"><span>N</span><b>NORTHSTAR</b></Link><nav className="ns-nav" aria-label="Primary navigation"><div className="ns-product-nav"><button className={`ns-product-trigger ${productMenuOpen ? "is-active" : ""}`} aria-expanded={productMenuOpen} aria-controls="product-menu" onClick={() => { setSolutionsMenuOpen?.(false); setProductMenuOpen(!productMenuOpen); }}>Platform <span aria-hidden="true">⌄</span></button>{productMenuOpen && <ProductMenu onNavigate={onNavigate} />}</div>{setSolutionsMenuOpen ? <div className="ns-solutions-nav"><button className={`ns-product-trigger ${solutionsMenuOpen ? "is-active" : ""}`} aria-expanded={solutionsMenuOpen} aria-controls="solutions-menu" onClick={toggleSolutions}>Solutions <span aria-hidden="true">⌄</span></button>{solutionsMenuOpen && <SolutionsMenu onNavigate={onNavigate} />}</div> : <button onClick={() => onNavigate("solutions")}>Solutions</button>}{navItems.filter((item) => item !== "Solutions").map((item) => item === "Pricing" ? <Link key={item} href="/pricing" className="ns-nav-link">{item}</Link> : <button key={item} onClick={() => onNavigate(item === "How It Works" ? "how-it-works" : item.toLowerCase())}>{item}</button>)}</nav><div className="ns-header-actions"><button className="ns-signin" onClick={onLogin}>Log in</button><button className="ns-button ns-button-dark" onClick={onGetStarted}>Sign in</button></div><button className="ns-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><i /><i /></button></header>;
}

function ProductMenu({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <div
      id="product-menu"
      className="ns-product-menu"
      role="region"
      aria-label="Platform capabilities"
    >
      <div className="ns-product-columns">
        {productMenuGroups.map((group) => (
          <div className="ns-product-group" key={group.label}>
            <p>{group.label}</p>

            {group.items.map((item) =>
              item.route ? (
                <Link href={item.route} key={item.title}>
                  <span>
                    <b>{item.title}</b>
                  </span>
                  <i aria-hidden="true">↗</i>
                </Link>
              ) : item.comingSoon ? (
                <span
                  className="ns-product-coming-soon"
                  key={item.title}
                  aria-label={`${item.title}, coming soon`}
                >
                  <b>{item.title}</b>
                  <small>Coming soon</small>
                </span>
              ) : (
                <button
                  key={item.title}
                  onClick={() => onNavigate(item.target ?? "top")}
                >
                  <span>
                    <b>{item.title}</b>
                  </span>
                  <i aria-hidden="true">↗</i>
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SolutionsMenu({ onNavigate }: { onNavigate: (id: string) => void }) {
  return <div id="solutions-menu" className="ns-product-menu ns-solutions-menu" role="region" aria-label="Solutions"><div className="ns-product-columns">{solutionsMenuGroups.map((group) => <div className="ns-product-group" key={group.label}><p>{group.label}</p>{group.items.map((item) => <button key={item.title} onClick={() => onNavigate(item.target ?? "solutions")}><span><b>{item.title}</b></span><i aria-hidden="true">↗</i></button>)}</div>)}</div></div>;
}

function ProductDemoVideo() {
  return <section id="product" className="ns-demo-section ns-container ns-scroll-reveal" aria-labelledby="demo-heading"><div className="ns-demo-heading"><div><p className="ns-kicker">SEE THE SYSTEM IN MOTION</p><h2 id="demo-heading">See how it works.</h2></div><p>Take a quick tour of how Northstar turns the way your business works into a clear, connected operating system.</p></div><div className="ns-demo-frame"><div className="ns-demo-thumbnail"><div className="ns-demo-orb ns-demo-orb-one" /><div className="ns-demo-orb ns-demo-orb-two" /><div className="ns-demo-browser"><div className="ns-demo-browser-bar"><span /><span /><span /><b>northstar / workspace</b></div><div className="ns-demo-browser-body"><aside><i /><strong>Northstar</strong><span className="active">Overview</span><span>Customers</span><span>Automations</span><span>Analytics</span></aside><div className="ns-demo-dashboard"><small>PERSONALIZED WORKSPACE</small><h3>Your business, at a glance.</h3><div className="ns-demo-metrics"><span><b>126</b>Active customers</span><span><b>18</b>Open leads</span><span><b>32</b>Jobs this week</span></div><div className="ns-demo-chart"><div><b>Customer growth</b><small>Last 6 months</small></div><i /><i /><i /><i /><i /><i /><i /><i /></div></div></div></div><div className="ns-demo-shade" /><button className="ns-demo-play" type="button" aria-label="Product demo video placeholder"><span>Play demo</span><b>▶</b></button><div className="ns-demo-placeholder"><span>VIDEO SOURCE</span><b>YouTube URL placeholder</b><small>Add your product-demo YouTube URL here</small></div></div><div className="ns-demo-caption"><span><i /> Product walkthrough</span><small>Coming soon · 02:18</small></div></div></section>;
}

const passwordRequirements = [
  { label: "12+ characters", test: (value: string) => value.length >= 12 },
  { label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Number", test: (value: string) => /\d/.test(value) },
  { label: "Symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function AuthModal({ mode, setMode, onClose }: { mode: "sign-in" | "create"; setMode: (mode: "sign-in" | "create") => void; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);

  const passwordChecks = passwordRequirements.map((requirement) => ({
    ...requirement,
    valid: requirement.test(password),
  }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "create") {
      if (!businessName.trim()) {
        setError("Tell us your business name so we can create your workspace.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      const invalid = passwordChecks.some((requirement) => !requirement.valid);
      if (invalid) {
        setError("Use 12+ characters with an uppercase letter, number, and symbol.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "create") {
        const registration = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, confirmPassword, businessName }),
        });

        const registrationData = await registration.json();
        if (!registration.ok) {
          throw new Error(registrationData.error?.message ?? "Unable to create account");
        }

        setSuccess("Your workspace is ready. Redirecting you now…");
      }

      const login = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const loginData = await login.json();
      if (!login.ok) {
        throw new Error(loginData.error?.message ?? "Unable to sign in");
      }

      const onboarding = await fetch("/api/v1/onboarding");
      if (onboarding.ok) {
        const onboardingData = await onboarding.json();
        if (onboardingData.onboarding?.status === "completed") {
          onClose();
          router.push("/dashboard");
          return;
        }
      }

      onClose();
      router.push("/onboarding");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Enter the email address for your Northstar account.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Unable to send password reset email");
      }
      setSuccess("We sent a password reset link to your email.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to send the reset email";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="auth-modal" onClick={(event) => event.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="modal-mark">N</span><p className="eyebrow">Welcome to northstar</p><h2>{forgotPassword ? "Reset your password" : mode === "sign-in" ? "Sign in to your workspace" : "Create your workspace"}</h2><p className="modal-copy">{forgotPassword ? "We’ll send a secure reset link to the email address on file." : mode === "sign-in" ? "Pick up where you left off." : "Set up your business workspace in a few minutes."}</p>{forgotPassword ? <form onSubmit={handlePasswordReset}><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" /></label>{error && <p className="form-error">{error}</p>}{success && <p className="form-success">{success}</p>}<button className="primary wide" type="submit" disabled={loading}>{loading ? "Sending reset link…" : "Send reset link"}<span>→</span></button><p className="switch-auth"><button type="button" onClick={() => { setForgotPassword(false); setError(""); setSuccess(""); }}>Back to sign in</button></p></form> : <form onSubmit={submit}><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" /></label>{mode === "create" && <label>Business name<input required type="text" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Your business" autoComplete="organization" /></label>}<label>Password<div className="password-field"><input required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} /><button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div></label>{mode === "create" && <label>Confirm password<input required type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm your password" autoComplete="new-password" /></label>}{mode === "sign-in" && <div className="auth-meta-row"><label className="checkbox-row"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Remember me</span></label><button type="button" className="link-button" onClick={() => setForgotPassword(true)}>Forgot password?</button></div>}{mode === "create" && <ul className="password-checklist">{passwordChecks.map((requirement) => <li key={requirement.label} className={requirement.valid ? "pass" : ""}>{requirement.valid ? "✓" : "○"} {requirement.label}</li>)}</ul>}{error && <p className="form-error">{error}</p>}{success && <p className="form-success">{success}</p>}<button className="primary wide" type="submit" disabled={loading}>{loading ? (mode === "create" ? "Creating workspace…" : "Signing in…") : mode === "sign-in" ? "Continue" : "Create workspace"}<span>→</span></button></form>}{!forgotPassword && <p className="switch-auth">{mode === "sign-in" ? "New to northstar?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "sign-in" ? "create" : "sign-in"); setError(""); setSuccess(""); }}>{mode === "sign-in" ? "Create an account" : "Sign in"}</button></p>}</div></div>;
}

async function responseMessage(response: Response, fallback: string) { const body = await response.text(); if (!body) return `${fallback}. Check the server configuration.`; try { return JSON.parse(body).error?.message ?? fallback; } catch { return fallback; } }
