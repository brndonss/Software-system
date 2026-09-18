"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const marketingFlow = [
  ["01", "New lead", "A customer signal enters the system."],
  ["02", "Customer context", "The useful history stays connected."],
  ["03", "Next action", "A follow-up recommendation is prepared."],
  ["04", "Draft", "A campaign or follow-up draft takes shape."],
  ["05", "Approval", "The team reviews the suggested work."],
  ["06", "Activity", "The result remains visible in the system."],
];

export default function MarketersSolutionPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".ns-marketers-reveal"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -8%" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function openAuth(mode: "sign-in" | "create") { setAuthMode(mode); setShowAuth(true); setMenuOpen(false); setProductMenuOpen(false); }
  function navigateToLanding(id?: string) { router.push(id ? `/#${id}` : "/"); }

  return <main className="ns-marketers-page">
    <PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} />
    <section className="ns-marketers-hero"><div className="ns-marketers-container ns-marketers-hero-grid ns-marketers-reveal"><div><p className="ns-kicker">FOR MARKETERS</p><h1>Turn customer signals<br />into action</h1><p className="ns-marketers-lede">Bring leads, customer context, follow-ups, campaign drafts, tasks, workflows, and activity into one organized operating system.</p><div className="ns-marketers-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-marketers-secondary" href="#marketing-system">Explore the system <span>↓</span></a></div></div><MarketingSignalVisual /></div></section>

    <section className="ns-marketers-problem ns-marketers-reveal"><div className="ns-marketers-container ns-marketers-narrow"><p className="ns-kicker">THE MARKETING OPERATIONS PROBLEM</p><h2>Good signals are only useful when they become organized work</h2><p>Leads, customer context, follow-ups, campaign ideas, tasks, and activity can easily become disconnected. The system helps keep the path from signal to reviewed action visible.</p></div></section>

    <section id="marketing-system" className="ns-marketers-section ns-marketers-reveal"><div className="ns-marketers-container"><div className="ns-marketers-section-heading"><p className="ns-kicker">MARKETING WORKFLOW</p><h2>From customer signal to a reviewable next step</h2><p>AI-assisted planning can help prepare recommendations and drafts without claiming that campaigns publish themselves.</p></div><div className="ns-marketers-flow">{marketingFlow.map(([number, title, detail], index) => <div key={title}><span>{number}</span><h3>{title}</h3><p>{detail}</p>{index < marketingFlow.length - 1 && <i>→</i>}</div>)}</div></div></section>

    <section className="ns-marketers-context ns-marketers-reveal"><div className="ns-marketers-container ns-marketers-split"><div><p className="ns-kicker">CUSTOMER CONTEXT</p><h2>See the signal behind the lead</h2><p>Customer and lead information can stay connected with the follow-ups, tasks, and recent activity that help the team understand what deserves attention.</p></div><CustomerSignalPanel /></div></section>

    <section className="ns-marketers-drafts ns-marketers-reveal"><div className="ns-marketers-container ns-marketers-split ns-marketers-split-reverse"><DraftPanel /><div><p className="ns-kicker">CAMPAIGN DRAFTS</p><h2>Prepare the idea before it becomes a commitment</h2><p>Marketing work can begin as a draft: an objective, audience, suggested copy, and next action ready for the team to review. Nothing here implies live publishing.</p></div></div></section>

    <section className="ns-marketers-followups ns-marketers-reveal"><div className="ns-marketers-container"><div className="ns-marketers-section-heading"><p className="ns-kicker">FOLLOW-UPS, TASKS, AND WORKFLOWS</p><h2>Keep the next move attached to the context</h2></div><div className="ns-marketers-task-board"><div><small>FOLLOW-UP</small><strong>Review new design lead</strong><span>Suggested next action</span></div><div><small>TASK</small><strong>Prepare discovery notes</strong><span>Ready for team review</span></div><div><small>WORKFLOW</small><strong>New lead follow-up</strong><span>Prepared process</span></div><div className="is-active"><small>AUTOMATION RECOMMENDATION</small><strong>Follow up with new inquiry</strong><span>Approval required</span></div></div></div></section>

    <section className="ns-marketers-activity ns-marketers-reveal"><div className="ns-marketers-container ns-marketers-split"><ActivityFeed /><div><p className="ns-kicker">ACTIVITY / RESULTS</p><h2>See what moved through the system</h2><p>Activity keeps recent actions visible across leads, customers, follow-ups, tasks, and reviewable workflow recommendations.</p></div></div></section>

    <section className="ns-marketers-before-after ns-marketers-reveal"><div className="ns-marketers-container"><div className="ns-marketers-section-heading"><p className="ns-kicker">ONE MARKETING OPERATING PICTURE</p><h2>Connect the pieces that shape the next action</h2></div><div className="ns-marketers-comparison"><div><p>BEFORE</p><h3>Signals in separate places</h3><span>New leads</span><span>Customer notes</span><span>Inbox</span><span>Campaign ideas</span><span>Tasks</span><span>Follow-up reminders</span></div><div className="is-after"><p>AFTER</p><h3>One organized system</h3><span>Customers</span><span>Leads</span><span>Tasks</span><span>Workflows</span><span>Automations</span><span>Activity</span></div></div></div></section>

    <section className="ns-marketers-final ns-marketers-reveal"><div className="ns-marketers-container ns-marketers-narrow"><p className="ns-kicker">BUILT FOR THE WORK AROUND MARKETING</p><h2>Make every customer signal easier to act on</h2><p>Give your team one place to organize context, prepare work, and understand what needs attention next.</p><div className="ns-marketers-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-marketers-secondary" href="/platform/system">Explore platform <span>↗</span></a></div></div></section>

    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
  </main>;
}

function MarketingSignalVisual() { return <div className="ns-marketers-signal-visual"><div className="ns-marketers-signal-line" /><div className="ns-marketers-signal-card signal-lead"><small>NEW LEAD</small><strong>Atlas Coffee</strong><span>New inquiry</span></div><div className="ns-marketers-signal-card signal-context"><small>CUSTOMER CONTEXT</small><strong>Project history connected</strong><span>Ready to review</span></div><div className="ns-marketers-signal-card signal-action"><small>NEXT ACTION</small><strong>Prepare discovery follow-up</strong><span>Recommendation</span></div><div className="ns-marketers-signal-card signal-draft"><small>DRAFT</small><strong>Local campaign idea</strong><span>Not published</span></div><div className="ns-marketers-signal-card signal-approval"><small>APPROVAL</small><strong>Review suggested task</strong><span>Team decision</span></div><div className="ns-marketers-signal-card signal-activity"><small>ACTIVITY</small><strong>Follow-up prepared</strong><span>Conceptual product preview</span></div><div className="ns-marketers-signal-caption"><i /> MARKETING SYSTEM / SIGNAL TO ACTION</div></div>; }
function CustomerSignalPanel() { return <div className="ns-marketers-panel"><div className="ns-marketers-panel-top"><span>LEAD CONTEXT</span><b>CONNECTED</b></div><h3>Atlas Coffee</h3><p>New inquiry · Website project</p><div><small>RECENT CONTEXT</small><span>First inquiry received</span><span>Service area identified</span></div><div><small>RECOMMENDED NEXT ACTION</small><strong>Prepare discovery follow-up</strong></div><div><small>ACTIVITY</small><span>Lead captured</span><span>Review pending</span></div></div>; }
function DraftPanel() { return <div className="ns-marketers-draft"><div className="ns-marketers-panel-top"><span>CAMPAIGN DRAFT</span><b>DRAFT / NOT PUBLISHED</b></div><h3>Local Landscaping Leads</h3><div><small>OBJECTIVE</small><strong>Generate qualified inquiries</strong></div><div><small>AUDIENCE</small><strong>Homeowners in service area</strong></div><div><small>NEXT ACTION</small><strong>Review draft and prepare follow-up</strong></div><button type="button">Review draft <span>↗</span></button></div>; }
function ActivityFeed() { return <div className="ns-marketers-activity-feed"><div className="ns-marketers-panel-top"><span>TODAY</span><b>ACTIVITY</b></div>{[["09:42", "New lead received"], ["10:18", "Customer context connected"], ["11:06", "Follow-up recommendation prepared"], ["12:34", "Task reviewed by team"], ["02:10", "Activity updated"]].map(([time, action]) => <div key={time}><time>{time}</time><span>{action}</span></div>)}</div>; }
