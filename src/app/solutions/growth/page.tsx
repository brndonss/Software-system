"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const growthFlow = ["New activity", "Leads organized", "Follow-ups identified", "Next action recommended", "Task / workflow", "Approval", "Activity/result"];

export default function GrowthSolutionPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".ns-growth-reveal"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -8%" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function openAuth(mode: "sign-in" | "create") { setAuthMode(mode); setShowAuth(true); setMenuOpen(false); setProductMenuOpen(false); }
  function navigateToLanding(id?: string) { router.push(id ? `/#${id}` : "/"); }

  return <main className="ns-growth-page">
    <PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} />
    <section className="ns-growth-hero"><div className="ns-growth-container ns-growth-hero-grid ns-growth-reveal"><div><p className="ns-kicker">FOR GROWTH</p><h1>Turn momentum<br />into a system</h1><p className="ns-growth-lede">Organize leads, follow-ups, customer context, tasks, workflows, recommendations, and activity as the volume of work increases.</p><div className="ns-growth-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-growth-secondary" href="#growth-system">Explore the system <span>↓</span></a></div></div><GrowthMomentumVisual /></div></section>

    <section className="ns-growth-problem ns-growth-reveal"><div className="ns-growth-container ns-growth-narrow"><p className="ns-kicker">GROWTH WITHOUT OPERATIONAL CHAOS</p><h2>More activity should not mean less clarity</h2><p>As a business grows, more leads, customers, follow-ups, tasks, and decisions arrive every day. A connected operating picture helps the team see what needs attention without promising automatic execution.</p></div></section>

    <section id="growth-system" className="ns-growth-section ns-growth-reveal"><div className="ns-growth-container"><div className="ns-growth-section-heading"><p className="ns-kicker">LEAD PIPELINE</p><h2>See where momentum needs a response</h2><p>Lead management and customer context can make follow-ups easier to identify and organize.</p></div><div className="ns-growth-pipeline"><div><p>NEW ACTIVITY</p><span>Atlas Coffee</span><span>New inquiry</span><span>Northline</span><span>Follow-up due</span></div><div><p>ORGANIZED</p><span>Acme Studio</span><span>Customer context connected</span><span>Summit Homes</span><span>Task in progress</span></div><div className="is-attention"><p>NEEDS ATTENTION</p><span>Atlas Coffee</span><span>Recommended next action</span><span>Summit Homes</span><span>Review proposal task</span></div></div></div></section>

    <section className="ns-growth-context ns-growth-reveal"><div className="ns-growth-container ns-growth-split"><div><p className="ns-kicker">CUSTOMER CONTEXT</p><h2>Keep the story attached to the signal</h2><p>Customer and lead details can stay connected with follow-ups, tasks, workflows, and recent activity so the next action has useful context.</p></div><GrowthContextPanel /></div></section>

    <section className="ns-growth-actions-section ns-growth-reveal"><div className="ns-growth-container"><div className="ns-growth-section-heading"><p className="ns-kicker">FOLLOW-UPS AND NEXT ACTIONS</p><h2>Turn more volume into organized work</h2></div><div className="ns-growth-work-grid"><div><small>FOLLOW-UP</small><strong>Review new inquiry</strong><span>Suggested next action</span></div><div><small>TASK</small><strong>Prepare customer update</strong><span>Ready for review</span></div><div><small>WORKFLOW</small><strong>New lead follow-up</strong><span>Prepared process</span></div><div className="is-active"><small>RECOMMENDATION</small><strong>Schedule discovery call</strong><span>AI-assisted planning</span></div></div></div></section>

    <section className="ns-growth-drafts ns-growth-reveal"><div className="ns-growth-container ns-growth-split ns-growth-split-reverse"><GrowthDraftPanel /><div><p className="ns-kicker">MARKETING CAMPAIGN DRAFTS</p><h2>Prepare the next idea before it goes live</h2><p>Campaign work can remain a draft for the team to review: objective, audience, suggested copy, and next action. Nothing here claims automatic publishing.</p></div></div></section>

    <section className="ns-growth-activity ns-growth-reveal"><div className="ns-growth-container ns-growth-split"><div><p className="ns-kicker">ACTIVITY AND RESULTS</p><h2>See the business moving</h2><p>Activity keeps recent changes visible across customers, leads, tasks, workflows, recommendations, and approved work.</p></div><GrowthActivity /></div></section>

    <section className="ns-growth-final ns-growth-reveal"><div className="ns-growth-container ns-growth-narrow"><p className="ns-kicker">BUILT FOR THE NEXT STAGE</p><h2>Turn growth into a system your team can understand</h2><p>Keep the work around your customers connected as the business gets busier.</p><div className="ns-growth-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-growth-secondary" href="/platform/system">Explore platform <span>↗</span></a></div></div></section>

    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
  </main>;
}

function GrowthMomentumVisual() { return <div className="ns-growth-momentum"><div className="ns-growth-momentum-line" />{growthFlow.map((step, index) => <div className={`ns-growth-momentum-card momentum-${index + 1}`} key={step}><small>{step.toUpperCase()}</small><strong>{index === 0 ? "New leads increasing" : index === 1 ? "Leads organized" : index === 2 ? "Follow-ups identified" : index === 3 ? "Prepare discovery call" : index === 4 ? "Task ready for review" : index === 5 ? "Team approval" : "Activity recorded"}</strong><span>{index < 4 ? "Customer signal" : index === 5 ? "Decision point" : "Conceptual product preview"}</span></div>)}</div>; }
function GrowthContextPanel() { return <div className="ns-growth-panel"><div className="ns-growth-panel-top"><span>CUSTOMER CONTEXT</span><b>CONNECTED</b></div><h3>Summit Homes</h3><p>Website project · Active</p><div><small>OPEN FOLLOW-UPS</small><span>Review proposal</span><span>Schedule next call</span></div><div><small>RECOMMENDED NEXT ACTION</small><strong>Prepare customer update</strong></div><div><small>RECENT ACTIVITY</small><span>Lead qualified</span><span>Task prepared</span></div></div>; }
function GrowthDraftPanel() { return <div className="ns-growth-draft"><div className="ns-growth-panel-top"><span>CAMPAIGN DRAFT</span><b>DRAFT / NOT PUBLISHED</b></div><h3>Local service awareness</h3><div><small>OBJECTIVE</small><strong>Prepare qualified inquiries</strong></div><div><small>AUDIENCE</small><strong>Customers in service area</strong></div><div><small>NEXT ACTION</small><strong>Review draft and follow-up task</strong></div><button type="button">Review draft <span>↗</span></button></div>; }
function GrowthActivity() { return <div className="ns-growth-activity-feed"><div className="ns-growth-panel-top"><span>TODAY</span><b>ACTIVITY</b></div>{[["09:42", "New lead received"], ["10:18", "Follow-up recommendation prepared"], ["11:06", "Task reviewed"], ["12:34", "Workflow approved for setup"], ["02:10", "Activity updated"]].map(([time, action]) => <div key={time}><time>{time}</time><span>{action}</span></div>)}</div>; }
