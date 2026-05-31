export const metadata = {
  title: "Privacy Policy | TradeX Terminal",
  description: "Privacy Policy for TradeX Terminal",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: May 22, 2026</p>
        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Introduction</h2>
            <p>TradeX Terminal (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the TradeX Terminal web application and Android app available at <a href="https://tradexterminal.online" className="text-[#5fc77a] underline">tradexterminal.online</a>. This Privacy Policy explains how we collect, use, and protect your personal information when you use our services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-white">Account information:</strong> Email address and password (stored securely via Supabase Auth).</li>
              <li><strong className="text-white">Profile information:</strong> Display name and avatar photo that you choose to set.</li>
              <li><strong className="text-white">Usage data:</strong> Pages visited, features used, and interaction patterns to improve the app.</li>
              <li><strong className="text-white">Trading journal entries:</strong> Trade notes, PnL records, and journal data you manually enter.</li>
              <li><strong className="text-white">Payment information:</strong> Subscription status only. We do not store credit card numbers. Payments are processed securely by Paddle.</li>
              <li><strong className="text-white">Device information:</strong> Browser type, operating system, and device type for compatibility purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain the TradeX Terminal service.</li>
              <li>To authenticate your account and manage your subscription.</li>
              <li>To personalize your experience (selected assets, settings, display name).</li>
              <li>To send important service emails (account confirmation, password reset).</li>
              <li>To improve our AI analysis features and app performance.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Storage and Security</h2>
            <p>Your data is stored securely using <strong className="text-white">Supabase</strong> (PostgreSQL database with row-level security). We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest. We do not sell, trade, or rent your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Third-Party Services</h2>
            <p className="mb-2">We use the following categories of third-party services that may process your data:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-white">Authentication and database hosting:</strong> secure storage of your account and journal data.</li>
              <li><strong className="text-white">Payment processor (Paddle):</strong> subscription billing. We do not store your payment credentials.</li>
              <li><strong className="text-white">Web hosting and CDN:</strong> delivery of the TradeX Terminal web application.</li>
              <li><strong className="text-white">AI analysis services:</strong> powering market analysis features. Only anonymized market data is sent; your personal information is never shared.</li>
              <li><strong className="text-white">Market data providers:</strong> real-time and historical financial market data used to power the terminal. No personal data is shared with these providers.</li>
              <li><strong className="text-white">Charting services:</strong> interactive financial charts embedded in the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies and Local Storage</h2>
            <p>We use cookies and browser local storage to maintain your login session, remember your preferences (selected assets, settings), and improve app performance. These are essential for the app to function and are not used for advertising.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Export your trading journal and PnL data.</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:tradex.edgefx@gmail.com" className="text-[#5fc77a] underline">tradex.edgefx@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Children&apos;s Privacy</h2>
            <p>TradeX Terminal is intended for users aged 18 and above. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal data, we will delete it immediately.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notification. Continued use of the app after changes constitutes your acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 space-y-1">
              <p><strong className="text-white">TradeX Terminal</strong></p>
              <p>Email: <a href="mailto:tradex.edgefx@gmail.com" className="text-[#5fc77a] underline">tradex.edgefx@gmail.com</a></p>
              <p>Website: <a href="https://tradexterminal.online" className="text-[#5fc77a] underline">tradexterminal.online</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
