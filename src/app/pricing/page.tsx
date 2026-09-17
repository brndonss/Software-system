"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthModal, PublicNavigation } from "@/app/page";

const plans = [
  {
    name: "FREE",
    price: "$0",
    summary: "For trying the platform",
    description: "A clean place to explore the workspace and see how the system fits your business.",
    cta: "Get started",
    featured: false,
    features: [
      "Business workspace",
      "Customers and leads",
      "Tasks and follow-ups",
      "Limited AI-assisted setup",
      "Basic activity",
    ],
    ai: "Included AI usage for trying the product.",
  },
  {
    name: "BASIC",
    price: "$10 / month",
    summary: "For individuals getting started",
    description: "A lightweight plan for getting organized and using the system as your business grows.",
    cta: "Get started",
    featured: false,
    features: [
      "Everything in Free",
      "AI-assisted business setup",
      "Customer and lead management",
      "Tasks and follow-ups",
      "Workflow recommendations",
      "Included AI usage",
    ],
    ai: "Included AI usage for day-to-day planning and setup assistance.",
  },
  {
    name: "PRO",
    price: "$30 / month",
    summary: "For businesses ready to use the platform seriously",
    description: "Built for growing teams that want more operating context, recommendations, and momentum.",
    cta: "Get started",
    featured: true,
    features: [
      "Everything in Basic",
      "More AI usage",
      "Workflows",
      "Automation recommendations",
      "Advanced business activity",
      "Team collaboration where supported",
    ],
    ai: "Included AI usage for more advanced workflows and recommendations.",
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    summary: "For larger organizations with advanced requirements",
    description: "A tailored plan for larger organizations with custom requirements, team scale, and operational complexity.",
    cta: "Contact us",
    featured: false,
    features: [
      "Everything in Pro",
      "Custom usage",
      "Organization-level requirements",
      "Custom integrations",
      "Priority support",
      "Contact us",
    ],
    ai: "Custom AI usage for larger-scale needs and advanced requirements.",
  },
];

const billingOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function PricingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

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
    <main className="ns-pricing-page">
      <PublicNavigation
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        productMenuOpen={productMenuOpen}
        setProductMenuOpen={setProductMenuOpen}
        onNavigate={navigateToLanding}
        onLogin={() => openAuth("sign-in")}
        onGetStarted={() => openAuth("create")}
      />

      <section className="ns-pricing-hero">
        <div className="ns-pricing-container">
          <p className="ns-kicker">PRICING</p>
          <h1>Pricing that grows with your business.</h1>
          <p className="ns-pricing-lede">Start simple. Upgrade as your business and usage grow.</p>

          <div className="ns-pricing-toggle" aria-label="Billing period selector">
            {billingOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={billing === option.value ? "active" : ""}
                onClick={() => setBilling(option.value as "monthly" | "yearly")}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="ns-pricing-note">
            {billing === "yearly"
              ? "Annual pricing is not configured yet. Monthly billing remains the active pricing presentation."
              : "Simple monthly pricing for the business operating system."}
          </p>
        </div>
      </section>

      <section className="ns-pricing-plans">
        <div className="ns-pricing-container ns-pricing-grid">
          {plans.map((plan) => (
            <article key={plan.name} className={`ns-pricing-card ${plan.featured ? "featured" : ""}`}>
              <div className="ns-pricing-card-head">
                <span className="ns-pricing-label">{plan.name}</span>
                {plan.featured && <span className="ns-pricing-popular">Most popular</span>}
              </div>

              <div className="ns-pricing-price-block">
                <h2>{plan.price}</h2>
                <p>{plan.summary}</p>
              </div>

              <p className="ns-pricing-description">{plan.description}</p>

              <button
                type="button"
                className={`ns-button ${plan.name === "ENTERPRISE" ? "ns-pricing-ghost" : "ns-button-dark"}`}
                onClick={() => {
                  if (plan.name !== "ENTERPRISE") {
                    openAuth("create");
                  }
                }}
              >
                {plan.cta}
                <span aria-hidden="true">↗</span>
              </button>

              <div className="ns-pricing-features">
                <span className="ns-pricing-ai-label">AI</span>
                <p>{plan.ai}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ns-pricing-credits">
        <div className="ns-pricing-container ns-pricing-credits-inner">
          <p className="ns-kicker">AI USAGE</p>
          <h2>Pay for the work your system does.</h2>
          <p>
            Normal business management should not consume credits. Viewing customers, managing leads,
            creating tasks, and checking activity are part of regular workspace use. AI-powered or
            compute-heavy actions may use included AI usage or credits for work such as AI-assisted
            business setup, analyzing business context, generating recommendations, generating workflows,
            and future AI automation or agent actions.
          </p>
        </div>
      </section>

      <section className="ns-pricing-enterprise">
        <div className="ns-pricing-container">
          <p className="ns-kicker">ENTERPRISE</p>
          <h2>Built for larger organizations.</h2>
          <p>
            For larger organizations, we can discuss custom usage, custom integrations, team requirements,
            security requirements, and priority support. Enterprise plans can be shaped around your
            operating needs and rollout timeline.
          </p>
          <div className="ns-pricing-enterprise-actions">
            <Link href="/" className="ns-button ns-button-dark">Back to home <span>↗</span></Link>
            <button type="button" className="ns-button ns-pricing-ghost" aria-label="Contact sales is not configured yet">Contact us <span>↗</span></button>
          </div>
        </div>
      </section>

      {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
    </main>
  );
}
