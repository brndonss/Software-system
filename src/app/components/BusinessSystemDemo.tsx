"use client";

import { CSSProperties, PointerEvent, useEffect, useState } from "react";

const modules = ["Customers", "Leads", "Tasks", "Workflows", "Automations", "Activity"];
const moduleDetails: Record<string, string> = { Customers: "Keep customer context together", Leads: "Capture and organize opportunities", Tasks: "Turn next actions into visible work", Workflows: "Structure repeatable processes", Automations: "Recommend and approve repeatable actions", Activity: "See what happened across the business" };
const journeyMessages = ["Your business already has the context.", "A new signal enters the system.", "The hard part is knowing what happens next.", "Turn context into the next clear action.", "Turn the action into repeatable work.", "Automate the repeatable work. Stay in control.", "See what happened across the system.", "One connected system for the work behind your business."];

export default function BusinessSystemDemo() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [journeyPhase, setJourneyPhase] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? journeyMessages.length - 1 : 0);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setJourneyPhase((phase) => Math.min(phase + 1, journeyMessages.length - 1)), 1150);
    return () => window.clearInterval(timer);
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 4;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -4;
    setTilt({ x, y });
  }

  function resetTilt() {
    setTilt({ x: 0, y: 0 });
  }

  const style = {
    "--demo-tilt-x": `${tilt.x}deg`,
    "--demo-tilt-y": `${tilt.y}deg`,
  } as CSSProperties;

  return <div className={`ns-business-demo phase-${journeyPhase}`} onPointerMove={handlePointerMove} onPointerLeave={() => { resetTilt(); setHoveredModule(null); }} style={style} aria-label="Illustrative business system journey"><div className="ns-demo-stage"><div className="ns-demo-beacon" /><div className="ns-demo-lines"><i /><i /><i /><i /><i /><i /></div><div className="ns-demo-card ns-demo-business"><small>BUSINESS</small><strong>Colorado Landscaping</strong><span>8-person team</span><em>Business context</em></div>{modules.map((module, index) => <div className={`ns-demo-card ns-demo-module module-${index + 1} ${hoveredModule === module ? "is-hovered" : ""}`} onPointerEnter={() => setHoveredModule(module)} key={module}><b>{module}</b><small>{index === 0 ? "Context" : index === 1 ? "Signal" : index === 2 ? "Next step" : index === 3 ? "Process" : index === 4 ? "Action" : "History"}</small>{hoveredModule === module && <em>{moduleDetails[module]}</em>}</div>)}<div className="ns-demo-card ns-demo-event"><small>NEW LEAD</small><strong>Illustrative Company</strong><span>Landscape project</span></div><div className="ns-demo-card ns-demo-ai"><small>AI / CONTEXT</small><strong>Context analyzed</strong><span><i /> Ready to recommend</span></div><div className="ns-demo-card ns-demo-recommendation"><small>RECOMMENDATION</small><strong>Follow up with new lead</strong><span>Suggested next action</span></div><div className="ns-demo-card ns-demo-action"><small>TASK</small><strong>Follow up with lead</strong><span>Next step prepared</span></div><div className="ns-demo-card ns-demo-workflow"><small>WORKFLOW</small><strong>New lead follow-up</strong><span>Prepared process</span></div><div className="ns-demo-card ns-demo-automation"><small>AUTOMATION</small><strong>Lead follow-up</strong><span>Recommended · Review · Approve</span></div><div className="ns-demo-card ns-demo-activity"><small>ACTIVITY</small><strong>Lead received</strong><span>Follow-up prepared · Task created</span></div><div className="ns-demo-caption"><span>BUSINESS SYSTEM</span><b>CONCEPT PREVIEW</b></div></div><p className="ns-demo-story" aria-live="polite">{journeyMessages[journeyPhase]}</p></div>;
}
