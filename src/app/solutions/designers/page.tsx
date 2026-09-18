"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const businessFlow = [
  ["01", "Client inquiry", "A new project enters the system."],
  ["02", "Business context", "The important details stay together."],
  ["03", "Recommended next action", "A useful follow-up is prepared."],
  ["04", "Project task", "The work gets a clear owner and next step."],
  ["05", "Follow-up", "The relationship stays visible."],
  ["06", "Activity recorded", "The story of the work remains connected."],
];

export default function DesignersSolutionPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".ns-designers-reveal"));
    sections.forEach((section) => section.classList.add("is-visible"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
    sections.forEach((section) => {
      section.classList.remove("is-visible");
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  function openAuth(mode: "sign-in" | "create") {
    setAuthMode(mode);
    setShowAuth(true);
    setMenuOpen(false);
    setProductMenuOpen(false);
  }

  function navigateToLanding(id?: string) {
    router.push(id ? `/#${id}` : "/");
  }

  return (
    <main className="ns-designers-page">
      <PublicNavigation
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        productMenuOpen={productMenuOpen}
        setProductMenuOpen={setProductMenuOpen}
        onNavigate={navigateToLanding}
        onLogin={() => openAuth("sign-in")}
        onGetStarted={() => openAuth("create")}
      />

      <section className="ns-designers-hero">
        <div className="ns-designers-container ns-designers-hero-grid ns-designers-reveal">
          <div className="ns-designers-hero-copy">
            <p className="ns-kicker">FOR DESIGNERS</p>
            <h1>Spend more time designing<br />Less time managing the work</h1>
            <p className="ns-designers-lede">Keep clients, leads, follow-ups, tasks, and the work around your projects in one connected system.</p>
            <div className="ns-designers-actions">
              <button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button>
              <a className="ns-designers-secondary" href="#designer-system">Explore the system <span>↓</span></a>
            </div>
          </div>
          <DesignerSystemVisual />
        </div>
      </section>

      <section className="ns-designers-problem ns-designers-reveal">
        <div className="ns-designers-container ns-designers-narrow">
          <p className="ns-kicker">THE BUSINESS AROUND THE WORK</p>
          <h2>Your design work isn&apos;t the messy part</h2>
          <p>The difficult part is everything surrounding it: new inquiries, client information, follow-ups, deadlines, tasks, and keeping track of what needs attention.</p>
        </div>
      </section>

      <section id="designer-system" className="ns-designers-section ns-designers-reveal">
        <div className="ns-designers-container">
          <div className="ns-designers-section-heading">
            <p className="ns-kicker">A CONNECTED BUSINESS SYSTEM</p>
            <h2>From inquiry to activity, without losing the thread.</h2>
          </div>
          <div className="ns-designers-flow">
            {businessFlow.map(([number, title, detail], index) => (
              <div className="ns-designers-flow-step" key={title}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{detail}</p>
                {index < businessFlow.length - 1 && <i aria-hidden="true">→</i>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ns-designers-context ns-designers-reveal">
        <div className="ns-designers-container ns-designers-split">
          <div className="ns-designers-split-copy">
            <p className="ns-kicker">EVERY CLIENT IN CONTEXT</p>
            <h2>Know where every relationship stands</h2>
            <p>Customer information, leads, tasks, and activity can stay connected instead of being scattered across different tools.</p>
          </div>
          <ClientPanel />
        </div>
      </section>

      <section className="ns-designers-ai ns-designers-reveal">
        <div className="ns-designers-container ns-designers-split ns-designers-split-reverse">
          <RecommendationPanel />
          <div className="ns-designers-split-copy">
            <p className="ns-kicker">AI-ASSISTED PLANNING</p>
            <h2>Turn context into the next clear action</h2>
            <p>The system can use business context to help prepare recommendations, workflows, and automation suggestions. You stay in control of what happens next.</p>
          </div>
        </div>
      </section>

      <section className="ns-designers-before-after ns-designers-reveal">
        <div className="ns-designers-container">
          <div className="ns-designers-section-heading">
            <p className="ns-kicker">A CLEARER OPERATING PICTURE</p>
            <h2>Keep the pieces connected.</h2>
          </div>
          <div className="ns-designers-comparison">
            <div><p>BEFORE</p><h3>Scattered project context</h3><span>Client details</span><span>Inbox</span><span>Notes</span><span>Tasks</span><span>Follow-ups</span><span>Project information</span></div>
            <div className="is-after"><p>AFTER</p><h3>One connected business system</h3><span>Customers</span><span>Leads</span><span>Tasks</span><span>Workflows</span><span>Activity</span></div>
          </div>
        </div>
      </section>

      <section className="ns-designers-final ns-designers-reveal">
        <div className="ns-designers-container ns-designers-narrow">
          <p className="ns-kicker">MAKE SPACE FOR THE WORK</p>
          <h2>Design the work<br />Let your system organize the rest</h2>
          <div className="ns-designers-actions"><button className="ns-button ns-button-accent" type="button" onClick={() => openAuth("create")}>Get started for free <span>↗</span></button><a className="ns-designers-secondary" href="/platform/system">Explore platform <span>↗</span></a></div>
        </div>
      </section>

      {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
    </main>
  );
}

function DesignerSystemVisual() {
  return <div className="ns-designers-system-visual"><div className="ns-designers-visual-line" /><div className="ns-designers-visual-card is-active"><small>NEW LEAD</small><strong>Acme Studio</strong><span>Brand identity project</span></div><div className="ns-designers-visual-card card-context"><small>AI CONTEXT</small><strong>Project inquiry understood</strong><span>Details connected for review</span></div><div className="ns-designers-visual-card card-action"><small>NEXT ACTION</small><strong>Schedule discovery call</strong><span>Suggested next step</span></div><div className="ns-designers-visual-card card-task"><small>TASK</small><strong>Prepare discovery notes</strong><span>Ready for your approval</span></div><div className="ns-designers-visual-card card-activity"><small>ACTIVITY</small><strong>Follow-up prepared</strong><span>Conceptual product preview</span></div><div className="ns-designers-visual-caption"><i /> BUSINESS SYSTEM / DESIGNER WORKSPACE</div></div>;
}

function ClientPanel() {
  return <div className="ns-designers-panel"><div className="ns-designers-panel-top"><span>CLIENT</span><b>ACTIVE</b></div><h3>Acme Studio</h3><p className="ns-designers-panel-subtitle">Brand identity project</p><div className="ns-designers-panel-section"><small>NEXT ACTION</small><strong>Review project follow-up</strong></div><div className="ns-designers-panel-columns"><div><small>TASKS</small><span>Discovery notes</span><span>Send proposal</span><span>Schedule review</span></div><div><small>ACTIVITY</small><span>Inquiry received</span><span>Follow-up prepared</span></div></div></div>;
}

function RecommendationPanel() {
  return <div className="ns-designers-recommendation"><div className="ns-designers-panel-top"><span>RECOMMENDATION</span><b>REVIEW</b></div><h3>Follow up with new design lead</h3><div><small>REASON</small><p>New inquiry received</p></div><div><small>SUGGESTED ACTION</small><p>Prepare discovery follow-up</p></div><button type="button">Review recommendation <span>↗</span></button></div>;
}
