"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const navItems = ["Solutions", "How It Works", "Resources"];
const buildStages = [["01", "Tell us about your business", "The context behind the work."], ["02", "AI analyzes how you work", "Patterns, bottlenecks, opportunities."], ["03", "AI designs your software", "Only the tools your business needs."], ["04", "AI identifies repetitive work", "Workflows ready for your approval."], ["05", "Your system starts working", "A clearer way to move every day."]];
const generatedModules = ["Customers", "Leads", "Jobs", "Appointments", "Tasks", "Follow-ups", "Analytics"];
const industrySystems = [{ name: "Landscaping", modules: ["Customers", "Leads", "Jobs", "Appointments", "Tasks", "Follow-ups"], tone: "sage" }, { name: "Consulting", modules: ["Clients", "Projects", "Proposals", "Meetings", "Tasks", "Invoices"], tone: "blue" }, { name: "Home services", modules: ["Customers", "Leads", "Jobs", "Estimates", "Appointments", "Follow-ups"], tone: "sand" }];
const workflowSteps = [{ label: "New lead", detail: "A lead arrives from your website or inbox.", icon: "01" }, { label: "Lead created", detail: "Northstar captures the context and source.", icon: "02" }, { label: "Follow-up created", detail: "The right next action is suggested.", icon: "03" }, { label: "Task assigned", detail: "Someone owns the momentum.", icon: "04" }, { label: "Response tracked", detail: "The outcome stays visible.", icon: "05" }];
const productMenuGroups = [{ label: "BUILD", items: [{ title: "Business System", detail: "A workspace shaped around how you operate.", target: "platform" }, { title: "Customer & Lead Management", detail: "Keep relationships and opportunities in view.", target: "solutions" }, { title: "Tasks & Follow-ups", detail: "Make the next action clear and accountable.", target: "automations" }] }, { label: "OPERATE", items: [{ title: "Workflows", detail: "Turn repeatable work into a visible process.", target: "automations" }, { title: "Automations", detail: "Approve the work your team should not repeat.", target: "automations" }, { title: "Activity Log", detail: "See what is moving across the business.", target: "resources" }] }, { label: "PLAN", items: [{ title: "AI-assisted Recommendations", detail: "Surface practical opportunities from your context.", target: "resources" }, { title: "Campaign Drafts", detail: "Prepare thoughtful growth work before it goes live.", target: "growth-support" }] }];

export default function Home() {
  const [showAuth, setShowAuth] = useState(false); const [authMode, setAuthMode] = useState<"sign-in" | "create">("create"); const [menuOpen, setMenuOpen] = useState(false); const [productMenuOpen, setProductMenuOpen] = useState(false); const [activeWorkflow, setActiveWorkflow] = useState(0);
  useEffect(() => { function closeProductMenu(event: MouseEvent) { if (!(event.target as HTMLElement).closest(".ns-product-nav")) setProductMenuOpen(false); } function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setProductMenuOpen(false); } document.addEventListener("click", closeProductMenu); document.addEventListener("keydown", closeOnEscape); return () => { document.removeEventListener("click", closeProductMenu); document.removeEventListener("keydown", closeOnEscape); }; }, []);
  function openAuth(mode: "sign-in" | "create") { setAuthMode(mode); setShowAuth(true); setMenuOpen(false); setProductMenuOpen(false); }
  function goTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); setProductMenuOpen(false); }
  function navigateTo(item: string) { const sectionIds: Record<string, string> = { Product: "product", Solutions: "solutions", "How It Works": "how-it-works", Resources: "resources" }; goTo(sectionIds[item] ?? "top"); }
  return <main className="ns-landing">
    <PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={goTo} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} />

    <section id="top" className="ns-hero ns-container"><div className="ns-hero-copy"><p className="ns-kicker"><span /> AI BUSINESS OPERATING SYSTEM</p><h1>Your business.<br /><em>Your software.</em><br />Built by AI.</h1><p className="ns-hero-lede">Northstar learns how your business works, builds the software you need, and helps automate the work that keeps everything moving.</p><div className="ns-hero-actions"><button className="ns-button ns-button-accent" onClick={() => openAuth("create")}>Build My Business System <span>↗</span></button><button className="ns-text-button" onClick={() => goTo("how-it-works")}>See How It Works <span>↓</span></button></div><div className="ns-proof"><span className="ns-proof-mark">✦</span><span>Designed around your business<br /><b>Not the other way around.</b></span></div></div><WorkspacePreview /></section>
    <section className="ns-statement ns-container"><p className="ns-kicker">THE SOFTWARE PROBLEM</p><h2>Stop forcing your business into software that wasn&apos;t built for you.</h2><p>Northstar builds around the way you actually work.</p></section>
    <ProductDemoVideo />

    <section id="how-it-works" className="ns-section ns-container"><div className="ns-section-intro"><p className="ns-kicker">01 / HOW IT WORKS</p><h2>From business questions to a working operating system.</h2><p>One thoughtful conversation becomes a system your team can use.</p></div><div className="ns-stage-list">{buildStages.map(([number, title, detail]) => <div className="ns-stage" key={number}><span className="ns-stage-number">{number}</span><h3>{title}</h3><p>{detail}</p><span className="ns-stage-arrow">↗</span></div>)}</div></section>

    <section id="platform" className="ns-builder-band"><div className="ns-section ns-container ns-builder-grid"><div className="ns-section-intro"><p className="ns-kicker">02 / THE SYSTEM BUILDER</p><h2>Describe the business. Watch the system take shape.</h2><p>Northstar turns your operating reality into a workspace, then keeps looking for ways to make it better.</p><div className="ns-input-quote">&ldquo;8-person landscaping company. We need more leads. We lose track of follow-ups. Scheduling takes too much time.&rdquo;</div></div><BuilderVisual /></div></section>

    <section id="solutions" className="ns-section ns-container"><div className="ns-section-intro ns-intro-wide"><p className="ns-kicker">03 / PERSONALIZED SOFTWARE</p><h2>Every business gets a different system.</h2><p>A landscaping company shouldn&apos;t use the same workspace as a law firm, dental practice, contractor, agency, or retailer.</p></div><div className="ns-industry-grid">{industrySystems.map((system) => <div className={`ns-industry ns-${system.tone}`} key={system.name}><div className="ns-industry-top"><span>GENERATED SYSTEM</span><b>↗</b></div><h3>{system.name}</h3><div className="ns-module-list">{system.modules.map((module, index) => <span key={module}><i>{String(index + 1).padStart(2, "0")}</i>{module}</span>)}</div></div>)}</div></section>

    <section id="automations" className="ns-section ns-container"><div className="ns-section-intro ns-intro-wide"><p className="ns-kicker">04 / AUTOMATIONS</p><h2>Then Northstar finds the work you shouldn&apos;t have to do.</h2><p>Approve the workflows that fit. Keep the decisions that matter.</p></div><div className="ns-workflow"><div className="ns-workflow-tabs">{workflowSteps.map((step, index) => <button className={activeWorkflow === index ? "active" : ""} onClick={() => setActiveWorkflow(index)} key={step.label}><span>{step.icon}</span>{step.label}</button>)}</div><div className="ns-workflow-detail"><div><p className="ns-kicker">WORKFLOW {workflowSteps[activeWorkflow].icon}</p><h3>{workflowSteps[activeWorkflow].label}</h3><p>{workflowSteps[activeWorkflow].detail}</p></div><div className="ns-flow-line">{workflowSteps.map((step, index) => <span className={index <= activeWorkflow ? "complete" : ""} key={step.label} />)}</div><div className="ns-workflow-next">Next action <b>{workflowSteps[Math.min(activeWorkflow + 1, workflowSteps.length - 1)].label}</b> <span>→</span></div></div></div></section>

    <section id="resources" className="ns-operating-band"><div className="ns-section ns-container"><div className="ns-section-intro ns-intro-wide"><p className="ns-kicker">05 / AI OPERATING SYSTEM</p><h2>Not another dashboard.<br /><em>An operating system for your business.</em></h2></div><div className="ns-os-window"><div className="ns-os-sidebar"><div className="ns-os-brand">N</div><span className="active">Overview</span><span>Customers</span><span>Leads</span><span>Tasks</span><span>Analytics</span><span>Automations</span></div><div className="ns-os-main"><div className="ns-os-top"><span>Colorado Landscaping</span><small>Personalized workspace · Live</small></div><div className="ns-os-metrics"><div><small>Open leads</small><b>18</b><span>+24% this month</span></div><div><small>Follow-ups due</small><b>07</b><span className="warn">Needs attention</span></div><div><small>Jobs this week</small><b>32</b><span>On track</span></div></div><div className="ns-os-columns"><div className="ns-os-chart"><div className="ns-chart-title"><b>Business activity</b><span>Last 30 days ˅</span></div><div className="ns-bars">{[35, 52, 43, 68, 57, 84, 71, 92, 76, 88, 100, 78].map((height, index) => <i style={{ height: `${height}%` }} key={index} />)}</div></div><div className="ns-assistant"><div className="ns-assistant-head"><span>✦</span><b>Northstar AI</b><small>READY</small></div><p>&ldquo;What should I automate?&rdquo;</p><div className="ns-assistant-answer">You&apos;re spending too much time following up with leads and estimates. I recommend starting with <b>Lead Follow-up</b> and <b>Estimate Follow-up.</b></div><button>Review recommendations <span>↗</span></button></div></div></div></div></div></section>

    <section className="ns-section ns-container"><div className="ns-split-heading"><div><p className="ns-kicker">06 / AUTONOMOUS BUSINESS WORK</p><h2>Give AI the repetitive work.</h2></div><p>Northstar can help capture leads, create tasks, schedule follow-ups, generate reports, draft marketing, organize customer information, monitor workflows, and surface the next best action.</p></div><div className="ns-availability"><div><span className="ns-status-dot" /> AVAILABLE NOW</div><p>Business analysis, system design, recommendations, task planning, activity logging, and campaign drafts.</p><div><span className="ns-status-dot outline" /> CONNECT YOUR TOOLS</div><p>Live email, calendar, advertising, payments, and external publishing require a connected account and your authorization.</p></div></section>
    <section id="growth-support" className="ns-ad-band"><div className="ns-section ns-container ns-ad-grid"><div className="ns-section-intro"><p className="ns-kicker">07 / GROWTH SUPPORT</p><h2>Prepare the next campaign without pretending it&apos;s already live.</h2><p>Northstar can turn what it learns about your business into a thoughtful acquisition draft.</p></div><div className="ns-campaign"><div className="ns-campaign-top"><span>AI RECOMMENDATION</span><b>DRAFT — NOT PUBLISHED</b></div><h3>Local Landscaping Leads</h3><div className="ns-campaign-data"><span>Objective<strong>Generate qualified leads</strong></span><span>Audience<strong>Homeowners in service area</strong></span><span>Suggested budget<strong>$25 / day</strong></span></div><div className="ns-ad-copy"><small>AD COPY</small><p>&ldquo;Professional landscaping that makes your outdoor space feel like home.&rdquo;</p></div><button className="ns-button ns-button-dark">Review campaign draft <span>↗</span></button></div></div></section>
    <section className="ns-philosophy ns-container"><p className="ns-kicker">THE NORTHSTAR PHILOSOPHY</p><h2>Software should adapt to your business.<br /><em>Not the other way around.</em></h2></section><section className="ns-final-cta ns-container"><p className="ns-kicker">START WITH YOUR BUSINESS</p><h2>Your business is unique.<br />Your software should be too.</h2><p>Tell Northstar how your business works. We&apos;ll help you build the system around it.</p><button className="ns-button ns-button-accent" onClick={() => openAuth("create")}>Build My Business System <span>↗</span></button></section>
    <footer className="ns-footer ns-container"><div className="ns-footer-brand"><button className="ns-logo" onClick={() => goTo("top")}><span>N</span><b>NORTHSTAR</b></button><p>AI BUSINESS OPERATING SYSTEM</p></div><div className="ns-footer-links"><div><b>Product</b><button onClick={() => goTo("how-it-works")}>How it works</button><button onClick={() => goTo("automations")}>Automations</button><button onClick={() => goTo("ai")}>AI</button><button>Security</button></div><div><b>Company</b><button>About</button><button>Contact</button></div><div><b>Legal</b><button>Privacy</button><button>Terms</button></div></div><small>© 2026 Northstar Systems</small></footer>
    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
  </main>;
}

export function PublicNavigation({ menuOpen, setMenuOpen, productMenuOpen, setProductMenuOpen, onNavigate, onLogin, onGetStarted }: { menuOpen: boolean; setMenuOpen: (open: boolean) => void; productMenuOpen: boolean; setProductMenuOpen: (open: boolean) => void; onNavigate: (id: string) => void; onLogin: () => void; onGetStarted: () => void }) {
  return <header className={`ns-header ${menuOpen ? "is-open" : ""}`}><Link className="ns-logo" href="/" aria-label="Home"><span>N</span><b>NORTHSTAR</b></Link><nav className="ns-nav" aria-label="Primary navigation"><div className="ns-product-nav"><button className={`ns-product-trigger ${productMenuOpen ? "is-active" : ""}`} aria-expanded={productMenuOpen} aria-controls="product-menu" onClick={() => setProductMenuOpen(!productMenuOpen)}>Platform <span aria-hidden="true">⌄</span></button>{productMenuOpen && <ProductMenu onNavigate={onNavigate} />}</div>{navItems.map((item) => <button key={item} onClick={() => onNavigate(item === "How It Works" ? "how-it-works" : item.toLowerCase())}>{item}</button>)}</nav><div className="ns-header-actions"><button className="ns-signin" onClick={onLogin}>Log in</button><button className="ns-button ns-button-dark" onClick={onGetStarted}>Get Started <span>↗</span></button></div><button className="ns-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><i /><i /></button></header>;
}

function ProductMenu({ onNavigate }: { onNavigate: (id: string) => void }) {
  return <div id="product-menu" className="ns-product-menu" role="region" aria-label="Platform capabilities"><div className="ns-product-columns">{productMenuGroups.map((group) => <div className="ns-product-group" key={group.label}><p>{group.label}</p>{group.items.map((item) => item.title === "Business System" ? <Link href="/platform/system" key={item.title} onClick={() => onNavigate("")}><span><b>{item.title}</b><small>{item.detail}</small></span><i aria-hidden="true">↗</i></Link> : <button key={item.title} onClick={() => onNavigate(item.target)}><span><b>{item.title}</b><small>{item.detail}</small></span><i aria-hidden="true">↗</i></button>)}</div>)}</div><div className="ns-product-preview"><p>BUILT AROUND YOUR BUSINESS</p><div className="ns-product-preview-window"><span>WORKSPACE / OVERVIEW</span><b>Customer growth</b><div><i /><i /><i /><i /><i /><i /></div></div><small>One system for the work that keeps moving.</small></div></div>;
}

function ProductDemoVideo() {
  return <section id="product" className="ns-demo-section ns-container" aria-labelledby="demo-heading"><div className="ns-demo-heading"><div><p className="ns-kicker">SEE THE SYSTEM IN MOTION</p><h2 id="demo-heading">See how it works.</h2></div><p>Take a quick tour of how Northstar turns the way your business works into a clear, connected operating system.</p></div><div className="ns-demo-frame"><div className="ns-demo-thumbnail"><div className="ns-demo-orb ns-demo-orb-one" /><div className="ns-demo-orb ns-demo-orb-two" /><div className="ns-demo-browser"><div className="ns-demo-browser-bar"><span /><span /><span /><b>northstar / workspace</b></div><div className="ns-demo-browser-body"><aside><i /><strong>Northstar</strong><span className="active">Overview</span><span>Customers</span><span>Automations</span><span>Analytics</span></aside><div className="ns-demo-dashboard"><small>PERSONALIZED WORKSPACE</small><h3>Your business, at a glance.</h3><div className="ns-demo-metrics"><span><b>126</b>Active customers</span><span><b>18</b>Open leads</span><span><b>32</b>Jobs this week</span></div><div className="ns-demo-chart"><div><b>Customer growth</b><small>Last 6 months</small></div><i /><i /><i /><i /><i /><i /><i /><i /></div></div></div></div><div className="ns-demo-shade" /><button className="ns-demo-play" type="button" aria-label="Product demo video placeholder"><span>Play demo</span><b>▶</b></button><div className="ns-demo-placeholder"><span>VIDEO SOURCE</span><b>YouTube URL placeholder</b><small>Add your product-demo YouTube URL here</small></div></div><div className="ns-demo-caption"><span><i /> Product walkthrough</span><small>Coming soon · 02:18</small></div></div></section>;
}

function WorkspacePreview() { return <div className="ns-preview-wrap"><div className="ns-preview-orbit orbit-one" /><div className="ns-preview-orbit orbit-two" /><div className="ns-preview"><div className="ns-preview-nav"><span className="ns-os-brand">N</span><span className="active">Overview</span><span>Customers</span><span>Leads</span><span>Jobs</span><span>Appointments</span><span>Tasks</span><span>Automations</span></div><div className="ns-preview-main"><div className="ns-preview-heading"><div><small>PERSONALIZED WORKSPACE</small><h3>Colorado Landscaping</h3></div><span className="live-dot">● LIVE</span></div><div className="ns-preview-stats"><div><small>Active customers</small><b>126</b><span>↗ 12.4%</span></div><div><small>Open leads</small><b>18</b><span>↗ 8.3%</span></div><div><small>Jobs this week</small><b>32</b><span>On track</span></div></div><div className="ns-preview-lower"><div className="ns-preview-chart"><div className="ns-chart-title"><b>Customer growth</b><span>Last 6 months</span></div><div className="ns-line-chart"><i /><i /><i /><svg viewBox="0 0 420 120" preserveAspectRatio="none"><path d="M0 100 C42 91 48 70 83 79 S138 59 175 64 S226 40 260 50 S315 25 347 35 S390 9 420 15" /></svg></div></div><div className="ns-preview-activity"><div className="ns-chart-title"><b>Recent activity</b><span>View all ↗</span></div><p><i className="green" />New lead captured <small>2m ago</small></p><p><i className="coral" />Follow-up task created <small>18m ago</small></p><p><i className="blue" />Job status updated <small>1h ago</small></p></div></div></div></div><div className="ns-float-card ns-float-ai"><span>✦</span><div><b>Northstar AI</b><small>3 recommendations ready</small></div></div><div className="ns-float-card ns-float-status"><i /> System building around you</div></div>; }

function BuilderVisual() { return <div className="ns-builder-visual"><div className="ns-terminal"><div className="ns-terminal-top"><span>northstar / system-builder</span><i /><i /><i /></div><div className="ns-terminal-body"><p><span>INPUT</span> business_context</p><blockquote>8-person landscaping company.<br />Need more leads. Follow-ups get lost.<br />Scheduling takes too much time.</blockquote>{["ANALYZING BUSINESS", "IDENTIFYING PROBLEMS", "SELECTING MODULES", "DESIGNING WORKFLOWS", "VALIDATING SYSTEM"].map((stage, index) => <div className={`ns-terminal-stage ${index < 3 ? "done" : index === 3 ? "current" : ""}`} key={stage}><i>{index < 3 ? "✓" : index === 3 ? "..." : ""}</i><span>{stage}</span><small>{index < 3 ? "COMPLETE" : index === 3 ? "IN PROGRESS" : "QUEUED"}</small></div>)}<div className="ns-ready"><span>✓</span><b>WORKSPACE READY</b><small>7 modules · 4 workflows · validated</small></div></div></div><div className="ns-generated"><p className="ns-kicker">GENERATED WORKSPACE</p>{generatedModules.map((module, index) => <span key={module}><i>{String(index + 1).padStart(2, "0")}</i>{module}</span>)}</div></div>; }

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
