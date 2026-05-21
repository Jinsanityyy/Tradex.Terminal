export const metadata = {
  title: "Privacy Policy - TradeX",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-zinc-400 text-sm mb-8">Last updated: May 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">1. Information We Collect</h2>
        <p className="text-zinc-300 leading-relaxed mb-3">
          TradeX collects the following information when you create an account and use our services:
        </p>
        <ul className="list-disc list-inside text-zinc-300 space-y-1">
          <li>Email address (for authentication)</li>
          <li>Display name and profile photo (optional, set by you)</li>
          <li>Trade journal entries and PnL data (entered manually by you)</li>
          <li>Exchange API keys (encrypted before storage — used only to sync your trade history)</li>
          <li>Usage data such as features used and pages visited</li>
          <li>Device information (browser type, operating system, device type)</li>
          <li>Subscription status (plan, billing period, payment provider reference)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">2. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-zinc-300 space-y-1">
          <li>To provide and maintain the TradeX service</li>
          <li>To authenticate your account and keep it secure</li>
          <li>To personalize your experience (display name, avatar, asset preferences)</li>
          <li>To process your subscription and manage billing</li>
          <li>To sync your trade history from connected exchanges</li>
          <li>To send important service notifications</li>
          <li>To improve and develop new features</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">3. Data Storage and Security</h2>
        <p className="text-zinc-300 leading-relaxed">
          Your data is securely stored using Supabase (a cloud database provider with SOC 2 Type 2
          compliance). All data is encrypted in transit (TLS) and at rest. Exchange API keys are
          encrypted using AES-256 before being stored and are never logged or exposed in plain text.
          We do not sell your personal information to third parties.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">4. Third-Party Services</h2>
        <p className="text-zinc-300 leading-relaxed mb-3">
          TradeX uses the following third-party services. Each has its own privacy policy:
        </p>
        <div className="space-y-2 text-zinc-300 text-sm">
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <p className="font-semibold text-white mb-1">Infrastructure</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase</strong> — authentication, database, and file storage</li>
              <li><strong>Vercel</strong> — hosting and serverless functions</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <p className="font-semibold text-white mb-1">Market Data</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>TwelveData</strong> — live price feeds and candlestick data</li>
              <li><strong>Finnhub</strong> — financial news and market quotes</li>
              <li><strong>Yahoo Finance</strong> — supplementary market data</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <p className="font-semibold text-white mb-1">AI Analysis</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Anthropic (Claude)</strong> — AI-powered market analysis and agent reasoning</li>
              <li><strong>Google Gemini</strong> — candlestick pattern analysis</li>
              <li><strong>Groq</strong> — supplementary AI inference</li>
            </ul>
            <p className="text-zinc-500 text-xs mt-2">
              Market data and news headlines are sent to AI providers for analysis. No personal user
              data (email, name, trade journal) is ever sent to AI providers.
            </p>
          </div>
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <p className="font-semibold text-white mb-1">Payments</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Stripe</strong> — credit/debit card subscription billing</li>
              <li><strong>PayPal</strong> — alternative subscription billing</li>
            </ul>
            <p className="text-zinc-500 text-xs mt-2">
              TradeX never stores your full card number or payment credentials. All payment
              processing is handled directly by Stripe or PayPal.
            </p>
          </div>
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <p className="font-semibold text-white mb-1">Exchange Integrations (optional)</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Binance, Bybit, OKX</strong> — trade history sync via encrypted API keys</li>
              <li><strong>cTrader / MetaAPI</strong> — broker account integration</li>
            </ul>
            <p className="text-zinc-500 text-xs mt-2">
              API keys are read-only by default and encrypted before storage. You can revoke access
              at any time from your exchange settings.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">5. Data Retention</h2>
        <ul className="list-disc list-inside text-zinc-300 space-y-1">
          <li>Account data is retained for as long as your account is active</li>
          <li>Trade journal and PnL data: retained until you delete it or your account</li>
          <li>AI analysis results: cached for up to 5 minutes, not permanently stored</li>
          <li>After account deletion: all personal data is permanently removed within 30 days</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">6. Market Data Disclaimer</h2>
        <p className="text-zinc-300 leading-relaxed">
          TradeX provides market information for educational and informational purposes only. The data
          and AI analysis displayed does not constitute financial advice. Past performance is not
          indicative of future results. Always conduct your own research before making any trading
          decisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">7. Your Rights</h2>
        <p className="text-zinc-300 leading-relaxed mb-3">You have the right to:</p>
        <ul className="list-disc list-inside text-zinc-300 space-y-1">
          <li>Access your personal data</li>
          <li>Update or correct your information (via Settings)</li>
          <li>Delete your account and all associated data</li>
          <li>Revoke exchange API key access at any time</li>
          <li>Export your trade journal data</li>
        </ul>
        <p className="text-zinc-300 leading-relaxed mt-3">
          To request account deletion or a data export, contact us at the email below.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">8. Children&apos;s Privacy</h2>
        <p className="text-zinc-300 leading-relaxed">
          TradeX is intended for users 18 years of age or older. We do not knowingly collect personal
          information from children under 18. If you believe a minor has created an account, contact
          us immediately for removal.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">9. Changes to This Policy</h2>
        <p className="text-zinc-300 leading-relaxed">
          We may update this Privacy Policy from time to time. Significant changes will be notified
          via email or an in-app notice. Continued use of TradeX after changes constitutes acceptance
          of the updated policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">10. Contact</h2>
        <p className="text-zinc-300">
          For privacy-related questions, data deletion requests, or any concerns, contact us at:{" "}
          <a href="mailto:tradex.edgefx@gmail.com" className="text-[#5fc77a] underline">
            tradex.edgefx@gmail.com
          </a>
        </p>
      </section>

      <p className="text-zinc-500 text-sm mt-12 border-t border-white/10 pt-6">
        © 2026 TradeX. All rights reserved.
      </p>
    </div>
  );
}
