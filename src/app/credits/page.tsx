"use client";

import Link from "next/link";
import { useState } from "react";

type CreditBalance = {
  amount: number;
  unit: string;
};

type CreditPackage = {
  amount: number;
  label: string;
  note: string;
};

type CreditUsage = {
  category: string;
  amount: number;
  detail: string;
};

type UsageHistoryItem = {
  action: string;
  category: string;
  amount: number;
  date: string;
};

const creditBalance: CreditBalance = { amount: 2450, unit: "credits" };

const usage: CreditUsage[] = [
  { category: "AI actions", amount: 320, detail: "Business analysis and recommendations" },
  { category: "Automations", amount: 180, detail: "Prepared workflow actions" },
  { category: "Workflows", amount: 50, detail: "Workflow planning and setup" },
];

const creditPackages: CreditPackage[] = [
  { amount: 1000, label: "1,000 credits", note: "For a focused boost" },
  { amount: 5000, label: "5,000 credits", note: "For growing operations" },
  { amount: 10000, label: "10,000 credits", note: "For an active system" },
];

const usageHistory: UsageHistoryItem[] = [
  { action: "Business context analysis", category: "AI actions", amount: 120, date: "Today" },
  { action: "Lead follow-up workflow", category: "Workflows", amount: 50, date: "Yesterday" },
  { action: "Recommendation review", category: "AI actions", amount: 80, date: "Mar 18" },
  { action: "Task preparation", category: "Automations", amount: 60, date: "Mar 17" },
];

function formatCredits(amount: number) {
  return new Intl.NumberFormat("en-US").format(amount);
}

export default function CreditsPage() {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);

  return (
    <main className="credits-shell">
      <header className="credits-header">
        <Link href="/dashboard" className="credits-brand" aria-label="Return to dashboard">
          <span className="credits-brand-mark">N</span>
          <span>northstar</span>
        </Link>
        <div className="credits-header-actions">
          <span className="credits-environment">Workspace billing</span>
          <Link href="/dashboard" className="credits-back-link">Dashboard <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <div className="credits-content">
        <div className="credits-intro">
          <div>
            <p className="credits-eyebrow">Credits</p>
            <h1>Fuel the work your system does.</h1>
            <p className="credits-subhead">Track usage and prepare your workspace for the next phase of work.</p>
          </div>
          <span className="credits-status"><i /> Account overview</span>
        </div>

        <section className="credits-balance-panel" aria-labelledby="current-balance-heading">
          <div>
            <p className="credits-label" id="current-balance-heading">Current balance</p>
            <strong className="credits-balance">{formatCredits(creditBalance.amount)}</strong>
            <span className="credits-balance-unit">{creditBalance.unit}</span>
          </div>
          <div className="credits-balance-note">
            <span className="credits-live-dot" />
            <div>
              <strong>Ready for use</strong>
              <small>Balance is display-only until billing is connected.</small>
            </div>
          </div>
        </section>

        <section className="credits-section" aria-labelledby="usage-heading">
          <div className="credits-section-heading">
            <div>
              <p className="credits-eyebrow">Usage</p>
              <h2 id="usage-heading">Where credits are going.</h2>
            </div>
            <span className="credits-demo-label">PRESENTATIONAL VIEW</span>
          </div>
          <div className="credits-usage-grid">
            {usage.map((item) => (
              <article className="credits-usage-card" key={item.category}>
                <span className="credits-card-mark" aria-hidden="true">↗</span>
                <p>{item.category}</p>
                <strong>{formatCredits(item.amount)}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="credits-section" aria-labelledby="buy-heading">
          <div className="credits-section-heading">
            <div>
              <p className="credits-eyebrow">Buy credits</p>
              <h2 id="buy-heading">Keep the system moving.</h2>
            </div>
            <span className="credits-demo-label">CHECKOUT PREVIEW</span>
          </div>
          <div className="credits-package-grid">
            {creditPackages.map((creditPackage) => (
              <article className="credits-package-card" key={creditPackage.amount}>
                <p>{creditPackage.label}</p>
                <small>{creditPackage.note}</small>
                <button type="button" onClick={() => setSelectedPackage(creditPackage)}>
                  Purchase credits <span aria-hidden="true">↗</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="credits-section credits-history-section" aria-labelledby="history-heading">
          <div className="credits-section-heading">
            <div>
              <p className="credits-eyebrow">Usage history</p>
              <h2 id="history-heading">Recent activity.</h2>
            </div>
            <span className="credits-demo-label">EXAMPLE DATA</span>
          </div>
          <div className="credits-history" role="table" aria-label="Example credit usage history">
            {usageHistory.map((item) => (
              <div className="credits-history-row" role="row" key={`${item.action}-${item.date}`}>
                <div className="credits-history-action" role="cell">
                  <strong>{item.action}</strong>
                  <small>{item.category}</small>
                </div>
                <span role="cell">-{formatCredits(item.amount)}</span>
                <time role="cell">{item.date}</time>
              </div>
            ))}
          </div>
        </section>
      </div>

      {selectedPackage && (
        <div className="credits-modal-backdrop" role="presentation" onClick={() => setSelectedPackage(null)}>
          <section className="credits-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-preview-heading" onClick={(event) => event.stopPropagation()}>
            <button className="credits-modal-close" type="button" onClick={() => setSelectedPackage(null)} aria-label="Close checkout preview">×</button>
            <p className="credits-eyebrow">Checkout preview</p>
            <h2 id="checkout-preview-heading">Checkout integration coming next.</h2>
            <p>This purchase flow is not connected yet. No payment was made, no card details were collected, and your balance will not change.</p>
            <div className="credits-modal-package"><span>{selectedPackage.label}</span><small>Preview only</small></div>
            <button className="credits-modal-dismiss" type="button" onClick={() => setSelectedPackage(null)}>Close preview</button>
          </section>
        </div>
      )}
    </main>
  );
}
