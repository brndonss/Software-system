"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const leadFlow = ["Lead received", "Business context understood", "Follow-up recommended", "Owner reviews", "Task / workflow prepared", "Activity recorded"];
const pipelineColumns = [
  { label: "NEW LEADS", items: [["Atlas Coffee", "New inquiry"], ["Northline", "Website redesign"]] },
  { label: "IN PROGRESS", items: [["Acme Studio", "Brand project"], ["Summit Homes", "Website"]] },
  { label: "NEEDS ATTENTION", items: [["Atlas Coffee", "Follow-up recommended"], ["Summit Homes", "Proposal task due"]] },
];

export default function AgenciesSolutionPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".ns-agencies-reveal"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -8%" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function openAuth(mode: "sign-in" | "create") { setAuthMode(mode); setShowAuth(true); setMenuOpen(false); setProductMenuOpen(false); }
  function navigateToLanding(id?: string) { router.push(id ? `/#${id}` : "/"); }

  return <main className="ns-agencies-page">
    <PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} />
    <section className="ns-agencies-hero"><div className="ns-agencies-container ns-agencies-hero-grid ns-agencies-reveal"><div><p className="ns-kicker">FOR AGENCIES</p><h1>Every client<br />One operating system</h1><p className="ns-agencies-lede">Keep leads, clients, follow-ups, tasks, workflows, and activity connected as your agency grows.</p><div className="ns-agencies-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-agencies-secondary" href="#agency-system">Explore the system <span>↓</span></a></div></div><AgencyCommandCenter /></div></section>

    <section className="ns-agencies-problem ns-agencies-reveal"><div className="ns-agencies-container ns-agencies-narrow"><p className="ns-kicker">THE AGENCY PROBLEM</p><h2>More clients shouldn&apos;t mean more chaos</h2><p>As an agency grows, information gets spread across inboxes, notes, project tools, spreadsheets, and conversations. The challenge is knowing what needs attention, which leads need follow-up, what each client is waiting for, and what happened recently.</p></div></section>

    <section id="agency-system" className="ns-agencies-section ns-agencies-reveal"><div className="ns-agencies-container"><div className="ns-agencies-section-heading"><p className="ns-kicker">CLIENT PIPELINE</p><h2>Know what needs attention across every account</h2><p>Customer and lead management gives the team a clearer view of relationship state without claiming a full traditional sales CRM.</p></div><div className="ns-agencies-pipeline">{pipelineColumns.map((column) => <div className="ns-agencies-pipeline-column" key={column.label}><p>{column.label}</p>{column.items.map(([name, detail]) => <div key={name + detail}><strong>{name}</strong><span>{detail}</span></div>)}</div>)}</div></div></section>

    <section className="ns-agencies-workflow ns-agencies-reveal"><div className="ns-agencies-container"><div className="ns-agencies-section-heading"><p className="ns-kicker">FROM LEAD TO CLIENT WORK</p><h2>Context becomes a suggested next step</h2><p>AI-assisted planning can help organize context into recommendations, prepared tasks, and reviewable workflow suggestions.</p></div><div className="ns-agencies-lead-flow">{leadFlow.map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < leadFlow.length - 1 && <i>→</i>}</div>)}</div></div></section>

    <section className="ns-agencies-context ns-agencies-reveal"><div className="ns-agencies-container ns-agencies-split"><div><p className="ns-kicker">EVERY CLIENT IN CONTEXT</p><h2>Stop rebuilding the story every time you open a client</h2><p>Keep customer information, active work, follow-ups, tasks, and recent activity connected so the team can understand what is happening without searching through disconnected tools.</p></div><AgencyClientPanel /></div></section>

    <section className="ns-agencies-operations ns-agencies-reveal"><div className="ns-agencies-container ns-agencies-split ns-agencies-split-reverse"><AgencyRecommendation /><div><p className="ns-kicker">AI-ASSISTED OPERATIONS</p><h2>Turn agency activity into the next clear action</h2><p>Business context can help the system prepare recommendations, workflow suggestions, automation suggestions, and follow-up actions for the team to review.</p></div></div></section>

    <section className="ns-agencies-control ns-agencies-reveal"><div className="ns-agencies-container ns-agencies-split"><div><p className="ns-kicker">STAY IN CONTROL</p><h2>Automation should help your agency<br />not take it over</h2><p>Recommended automations can be reviewed before activation where supported. The team keeps the decision.</p></div><ApprovalPanel /></div></section>

    <section className="ns-agencies-activity ns-agencies-reveal"><div className="ns-agencies-container ns-agencies-split ns-agencies-split-reverse"><ActivityPanel /><div><p className="ns-kicker">AGENCY ACTIVITY</p><h2>See the business moving</h2><p>Activity gives the agency a clearer view of recent actions across clients, leads, tasks, and reviewable workflows.</p></div></div></section>

    <section className="ns-agencies-before-after ns-agencies-reveal"><div className="ns-agencies-container"><div className="ns-agencies-section-heading"><p className="ns-kicker">ONE OPERATING PICTURE</p><h2>Keep the operation connected.</h2></div><div className="ns-agencies-comparison"><div><p>BEFORE</p><h3>Disconnected pieces</h3><span>Inbox</span><span>Spreadsheets</span><span>Notes</span><span>Client messages</span><span>Tasks</span><span>Lead information</span><span>Follow-up reminders</span></div><div className="is-after"><p>AFTER</p><h3>ONE CONNECTED SYSTEM</h3><span>Customers</span><span>Leads</span><span>Tasks</span><span>Workflows</span><span>Automations</span><span>Activity</span></div></div></div></section>

    <section className="ns-agencies-final ns-agencies-reveal"><div className="ns-agencies-container ns-agencies-narrow"><p className="ns-kicker">BUILT FOR THE WORK AROUND THE WORK</p><h2>Grow the agency<br />without losing the operation</h2><p>Give your team one place to understand clients, work, and what needs attention next.</p><div className="ns-agencies-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-agencies-secondary" href="/platform/system">Explore platform <span>↗</span></a></div></div></section>

    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
  </main>;
}

function AgencyCommandCenter() {
  return <div className="ns-agencies-command"><div className="ns-agencies-command-lines" /><div className="ns-agencies-command-center"><small>AGENCY WORKSPACE</small><strong>Client operations</strong><span>6 active relationships · reviewable work</span></div><div className="ns-agencies-client client-one"><small>CLIENT</small><strong>Acme Studio</strong><span>Brand identity · Active</span></div><div className="ns-agencies-client client-two"><small>CLIENT</small><strong>Summit Homes</strong><span>Website project · Proposal</span></div><div className="ns-agencies-client client-three"><small>NEW LEAD</small><strong>Atlas Coffee</strong><span>New inquiry</span></div><div className="ns-agencies-client client-four"><small>TASK</small><strong>Send Summit proposal</strong><span>Today</span></div><div className="ns-agencies-client client-five"><small>RECOMMENDATION</small><strong>Follow up with Atlas Coffee</strong><span>Ready for review</span></div><div className="ns-agencies-client client-six"><small>ACTIVITY</small><strong>Acme review completed</strong><span>Recent activity</span></div><div className="ns-agencies-command-caption"><i /> CONCEPTUAL AGENCY WORKSPACE</div></div>;
}

function AgencyClientPanel() { return <div className="ns-agencies-panel"><div className="ns-agencies-panel-top"><span>CLIENT</span><b>ACTIVE</b></div><h3>Acme Studio</h3><p>Brand identity</p><div><small>OPEN TASKS</small><span>Prepare review</span><span>Send deliverables</span><span>Schedule follow-up</span></div><div><small>RECOMMENDATION</small><strong>Prepare next client update</strong></div><div><small>RECENT ACTIVITY</small><span>Project started</span><span>Review completed</span><span>Follow-up prepared</span></div></div>; }
function AgencyRecommendation() { return <div className="ns-agencies-recommendation"><div className="ns-agencies-panel-top"><span>RECOMMENDATION</span><b>REVIEW</b></div><h3>Follow up with Atlas Coffee</h3><div><small>REASON</small><p>New inquiry has not been reviewed</p></div><div><small>SUGGESTED ACTION</small><p>Prepare discovery follow-up</p></div><button type="button">Review recommendation <span>↗</span></button></div>; }
function ApprovalPanel() { return <div className="ns-agencies-approval"><div className="ns-agencies-panel-top"><span>AUTOMATION RECOMMENDATION</span><b>READY FOR REVIEW</b></div><h3>New lead follow-up</h3><div><small>TRIGGER</small><strong>New lead received</strong></div><div><small>SUGGESTED ACTION</small><strong>Prepare follow-up task</strong></div><button type="button">Review <span>↗</span></button></div>; }
function ActivityPanel() { return <div className="ns-agencies-activity-panel"><div className="ns-agencies-panel-top"><span>TODAY</span><b>ACTIVITY</b></div>{[["09:42", "Atlas Coffee lead received"], ["10:18", "Follow-up recommendation prepared"], ["11:06", "Acme Studio task completed"], ["12:34", "Summit Homes workflow reviewed"], ["02:10", "Client activity updated"]].map(([time, action]) => <div key={time} className="ns-agencies-activity-row"><time>{time}</time><span>{action}</span></div>)}</div>; }
