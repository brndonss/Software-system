"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthModal, PublicNavigation } from "@/app/page";

type CreditOption = {
  credits: number;
  monthlyPrice: number;
};

const basicCreditOptions: CreditOption[] = [
  { credits: 1000, monthlyPrice: 10 },
  { credits: 2000, monthlyPrice: 20 },
  { credits: 3000, monthlyPrice: 30 },
  { credits: 5000, monthlyPrice: 50 },
  { credits: 8000, monthlyPrice: 80 },
  { credits: 10000, monthlyPrice: 100 },
  { credits: 15000, monthlyPrice: 150 },
];

const proCreditOptions: CreditOption[] = [
  { credits: 3000, monthlyPrice: 30 },
  { credits: 5000, monthlyPrice: 50 },
  { credits: 10000, monthlyPrice: 100 },
  { credits: 20000, monthlyPrice: 200 },
  { credits: 30000, monthlyPrice: 300 },
  { credits: 50000, monthlyPrice: 500 },
  { credits: 100000, monthlyPrice: 1000 },
];

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
    creditAllowance: "500 AI credits to try",
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
    creditOptions: basicCreditOptions,
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
    creditOptions: proCreditOptions,
  },
];

const billingOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

type CreditPlan = (typeof plans)[number] & { creditOptions?: Array<number | CreditOption>; creditAllowance?: string };

export default function PricingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("create");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [basicCredits, setBasicCredits] = useState(1000);
  const [proCredits, setProCredits] = useState(3000);
  const [showCustomOrder, setShowCustomOrder] = useState(false);
  const selectedBasicCreditOption = basicCreditOptions.find((option) => option.credits === basicCredits) ?? basicCreditOptions[0];
  const selectedProCreditOption = proCreditOptions.find((option) => option.credits === proCredits) ?? proCreditOptions[0];

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
          {(plans as CreditPlan[]).map((plan) => (
            <article key={plan.name} className={`ns-pricing-card ${plan.featured ? "featured" : ""}`}>
              <div className="ns-pricing-card-head">
                <span className="ns-pricing-label">{plan.name}</span>
                {plan.featured && <span className="ns-pricing-popular">Most popular</span>}
              </div>

              <div className="ns-pricing-price-block">
                <h2>{plan.name === "BASIC" ? `$${selectedBasicCreditOption.monthlyPrice.toLocaleString()}` : plan.name === "PRO" ? `$${selectedProCreditOption.monthlyPrice.toLocaleString()}` : plan.price}</h2>
                {(plan.name === "BASIC" || plan.name === "PRO") && <span className="ns-pricing-price-unit">per month</span>}
                <p>{plan.summary}</p>
              </div>

              <p className="ns-pricing-description">{plan.description}</p>

              {plan.name === "FREE" ? (
                <div className="ns-pricing-credit-fixed"><span>AI CREDIT ALLOWANCE</span><strong>{plan.creditAllowance}</strong></div>
              ) : (
                <div className="ns-pricing-credit-selector">
                  <label htmlFor={`${plan.name.toLowerCase()}-credits`}>AI credits / month</label>
                  <select
                    id={`${plan.name.toLowerCase()}-credits`}
                    value={plan.name === "BASIC" ? basicCredits : proCredits}
                    onChange={(event) => plan.name === "BASIC" ? setBasicCredits(Number(event.target.value)) : setProCredits(Number(event.target.value))}
                  >
                    {plan.creditOptions?.map((option) => {
                      const credits = typeof option === "number" ? option : option.credits;
                      return <option value={credits} key={credits}>{credits.toLocaleString()} AI credits / month</option>;
                    })}
                  </select>
                  <small>Final pricing shown at checkout</small>
                </div>
              )}

              <div className="ns-pricing-features">
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
              <button type="button" className="ns-button ns-button-dark ns-pricing-card-cta" onClick={() => openAuth("create")}>
                {plan.cta} <span aria-hidden="true">↗</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="ns-pricing-enterprise">
        <div className="ns-pricing-container">
          <p className="ns-kicker">ENTERPRISE</p>
          <h2>Custom usage, higher limits, and support for larger operations.</h2>
          <p>
            Custom usage, higher limits, and support for larger operations. Need more credits? Contact sales for custom usage.
          </p>
          <div className="ns-pricing-enterprise-actions">
            <button type="button" className="ns-button ns-button-dark" onClick={() => setShowCustomOrder(true)}>Contact sales <span>↗</span></button>
          </div>
        </div>
      </section>

      {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
      {showCustomOrder && (
        <div className="ns-credit-modal-backdrop" role="presentation" onClick={() => setShowCustomOrder(false)}>
          <section className="ns-credit-modal ns-custom-order-modal" role="dialog" aria-modal="true" aria-labelledby="custom-order-heading" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="ns-credit-modal-close" onClick={() => setShowCustomOrder(false)} aria-label="Close custom order preview">×</button>
            <p className="ns-kicker">CUSTOM ORDER PREVIEW</p>
            <h2 id="custom-order-heading">Tell us what you need.</h2>
            <p>This form is a preview until the backend and contact workflow are connected. Nothing will be submitted.</p>
            <form onSubmit={(event) => event.preventDefault()}>
              <label>Business name<input type="text" placeholder="Your business" /></label>
              <label>Work email<input type="email" placeholder="you@company.com" /></label>
              <label>Estimated monthly usage<input type="text" placeholder="Example: 25,000 credits" /></label>
              <label>Message<textarea placeholder="Tell us about your expected usage" rows={3} /></label>
              <button type="submit" className="ns-button ns-button-accent">Request custom order <span aria-hidden="true">↗</span></button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
