"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const stages = ["queued", "analyzing", "generating", "validating", "completed"];
const labels: Record<string, string> = { queued: "Preparing your workspace", analyzing: "Understanding your business", generating: "Designing your system", validating: "Checking everything", completed: "Your system is ready" };

export default function BuildingPage() {
  const { buildId } = useParams<{ buildId: string }>();
  const router = useRouter();
  const [status, setStatus] = useState("queued");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/system-builds/${buildId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "Unable to read build status");
        if (!active) return;
        setStatus(data.build.status);
        if (data.build.status === "completed") { router.push("/dashboard"); return; }
        if (data.build.status === "failed") { setError(data.build.error_message ?? "The system build failed."); return; }
        window.setTimeout(poll, 1500);
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : "Unable to read build status"); }
    };
    poll();
    return () => { active = false; };
  }, [buildId, router]);

  const current = stages.indexOf(status);
  return <main className="building-shell"><div className="building-card"><div className="brand"><span className="brand-mark">N</span><span>northstar</span></div><p className="eyebrow">System builder</p><h1>{error ? "We couldn't finish your system." : labels[status] ?? "Building your system"}</h1><p className="building-copy">{error ? error : "We are shaping your workspace around the way your business actually works."}</p>{error ? <div className="build-error"><strong>Nothing was published.</strong><span>Fix the configuration and start another build from onboarding.</span><button className="primary" onClick={() => router.push("/onboarding")}>Return to onboarding <span>→</span></button></div> : <div className="build-stages">{stages.slice(0, -1).map((stage, index) => <div className={`build-stage ${index < current ? "done" : index === current ? "current" : ""}`} key={stage}><span>{index < current ? "✓" : index + 1}</span><strong>{labels[stage]}</strong><small>{index < current ? "Complete" : index === current ? "In progress" : "Waiting"}</small></div>)}</div>}</div></main>;
}
