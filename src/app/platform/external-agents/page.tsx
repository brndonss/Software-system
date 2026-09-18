"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, PublicNavigation } from "@/app/page";

const permissionRows = [
  ["Customers", "Read"],
  ["Tasks", "Read / Write"],
  ["Workflows", "Request"],
  ["Automations", "Approval required"],
];

const systemLinks = [
  ["Customers", "Selected context"],
  ["Tasks", "Approved work"],
  ["Workflows", "Requested process"],
  ["Automations", "Controlled action"],
  ["Activity", "Visible history"],
];

export default function ExternalAgentsPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");

  function openAuth(mode: "sign-in" | "create") {
    setAuthMode(mode);
    setShowAuth(true);
    setMenuOpen(false);
    setProductMenuOpen(false);
  }

  function navigateToLanding(id: string) {
    router.push(id ? `/#${id}` : "/");
  }

  return <main className="ns-external-page"><PublicNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} onNavigate={navigateToLanding} onLogin={() => openAuth("sign-in")} onGetStarted={() => openAuth("create")} /><section className="ns-external-hero"><div className="ns-external-container"><p className="ns-kicker">A FUTURE DIRECTION FOR THE PLATFORM</p><h1>Let other AI systems work with your business, on your terms.</h1><p className="ns-external-lede">External Agents are a product direction for letting authorized outside AI tools interact with selected parts of a business system without receiving unrestricted access.</p><div className="ns-external-actions"><button className="ns-button ns-external-primary" onClick={() => openAuth("create")}>Get Started <span>↗</span></button><a href="#external-flow" className="ns-external-secondary">Explore the model <span>↓</span></a></div><p className="ns-external-note"><span /> External Agent access is not implemented yet.</p></div></section><section id="external-flow" className="ns-external-flow ns-external-container"><div className="ns-external-heading"><p className="ns-kicker">CONTROLLED BY DESIGN</p><h2>Outside intelligence. Explicit boundaries.</h2><p>The concept starts with authorization, scoped access, and visible outcomes. It is not an open door into the business system.</p></div><div className="ns-external-pipeline"><div><span>01</span><b>External Agent</b><small>An outside AI tool or worker</small></div><i aria-hidden="true">↓</i><div className="permission"><span>02</span><b>Permission layer</b><small>Explicit scope and approved access</small></div><i aria-hidden="true">↓</i><div><span>03</span><b>Business System</b><small>Selected operational context</small></div><i aria-hidden="true">↓</i><div><span>04</span><b>Action or approval</b><small>Control before important work</small></div><i aria-hidden="true">↓</i><div><span>05</span><b>Activity</b><small>Actions remain visible</small></div></div></section><section className="ns-external-visual"><div className="ns-external-container"><div className="ns-external-visual-heading"><div><p className="ns-kicker">SCOPED PERMISSIONS</p><h2>Access should be specific, visible, and earned.</h2></div><p>This is a static concept visual. The repository currently has business modules and activity logging, but no external-agent permission layer, public agent API, OAuth, MCP server, or integration runtime.</p></div><div className="ns-external-console"><div className="ns-external-console-top"><span>EXTERNAL AGENT / PERMISSION PREVIEW</span><b>CONCEPT ONLY</b></div><div className="ns-external-console-body"><aside><i /><strong>Access scope</strong><span className="active">Permissions</span><span>Business System</span><span>Approval</span><span>Activity</span></aside><div className="ns-external-console-main"><small>EXTERNAL AGENT</small><h3>Operations helper</h3><div className="ns-permission-list">{permissionRows.map(([name, access]) => <div key={name}><span><b>{name}</b><small>Business capability</small></span><em className={access === "Approval required" ? "approval" : ""}>{access}</em></div>)}</div><div className="ns-external-console-footer"><span><i /> No unrestricted access</span><span>Approval remains explicit</span></div></div></div></div></div></section><section className="ns-external-sections ns-external-container"><div className="ns-external-heading"><p className="ns-kicker">THE OPERATING MODEL</p><h2>A useful outside tool should fit the system, not bypass it.</h2></div><div className="ns-external-grid"><article><span>01</span><h3>Connect external intelligence</h3><p>Future outside AI tools could work with selected business context rather than isolated, unstructured data.</p></article><article><span>02</span><h3>Control what agents can access</h3><p>Permission scope is the core idea: define what an outside agent may read, write, request, or never see.</p></article><article><span>03</span><h3>Keep important actions controlled</h3><p>Actions that affect the business should be reviewable and owner-approved in the intended model.</p></article><article><span>04</span><h3>Keep work visible</h3><p>The existing Activity capability provides the accurate foundation for a future history of business actions and outcomes.</p></article></div></section><section className="ns-external-difference ns-external-container"><div className="ns-external-heading"><p className="ns-kicker">TWO TYPES OF WORKER</p><h2>Inside the platform or outside it. The boundary matters.</h2></div><div className="ns-external-comparison"><div><small>INTERNAL AGENTS</small><h3>Built within the platform.</h3><p>A future business worker shaped by the system’s context, workflows, and owner decisions.</p></div><div><small>EXTERNAL AGENTS</small><h3>Outside AI systems.</h3><p>A future authorized tool that interacts with selected parts of the system through explicit scope.</p></div></div></section><section className="ns-external-system ns-external-container"><div className="ns-external-heading"><p className="ns-kicker">CONNECTED TO THE SYSTEM</p><h2>The future connection points already have meaningful names.</h2></div><div className="ns-external-links">{systemLinks.map(([title, detail], index) => <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><small>{detail}</small></div>)}</div></section><section className="ns-external-outcome ns-external-container"><p className="ns-kicker">THE PROMISE</p><h2>More useful intelligence. More deliberate control.</h2><p>The long-term goal is a business system that can work with other AI tools without losing permission boundaries, owner judgment, or a visible record of what happened.</p><button className="ns-button ns-external-primary" onClick={() => openAuth("create")}>Build your system <span>↗</span></button></section>{showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}</main>;
}
