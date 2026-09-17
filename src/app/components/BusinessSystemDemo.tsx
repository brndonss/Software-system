"use client";

import { CSSProperties, PointerEvent, useState } from "react";

const modules = ["Customers", "Leads", "Tasks", "Workflows", "Automations", "Activity"];

export default function BusinessSystemDemo() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

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

  return <div className="ns-business-demo" onPointerMove={handlePointerMove} onPointerLeave={resetTilt} style={style} aria-label="Illustrative business system animation"><div className="ns-demo-stage"><div className="ns-demo-beacon" /><div className="ns-demo-lines"><i /><i /><i /><i /><i /><i /></div><div className="ns-demo-card ns-demo-business"><small>BUSINESS</small><strong>Colorado Landscaping</strong><span>8-person team</span><em>Understanding your business...</em></div>{modules.map((module, index) => <div className={`ns-demo-card ns-demo-module module-${index + 1}`} key={module}><b>{module}</b><small>{index === 0 ? "Context" : index === 1 ? "Signal" : index === 2 ? "Next step" : index === 3 ? "Process" : index === 4 ? "Action" : "History"}</small></div>)}<div className="ns-demo-card ns-demo-event"><small>NEW LEAD</small><strong>Illustrative Company</strong><span>Landscape project</span></div><div className="ns-demo-card ns-demo-ai"><small>AI</small><strong>Context analyzed</strong><span><i /> Ready to recommend</span></div><div className="ns-demo-card ns-demo-recommendation"><small>RECOMMENDATION</small><strong>Follow up with new lead</strong><span>Suggested next action</span></div><div className="ns-demo-card ns-demo-action"><small>TASK</small><strong>Follow up with lead</strong><span>Tomorrow</span></div><div className="ns-demo-card ns-demo-workflow"><small>WORKFLOW</small><strong>New lead follow-up</strong><span>Prepared process</span></div><div className="ns-demo-card ns-demo-automation"><small>AUTOMATION</small><strong>Ready for review</strong><span>Concept only</span></div><div className="ns-demo-card ns-demo-activity"><small>ACTIVITY</small><strong>Lead received</strong><span>Task prepared · Workflow identified</span></div><div className="ns-demo-caption"><span>BUSINESS SYSTEM</span><b>CONCEPT PREVIEW</b></div></div></div>;
}
