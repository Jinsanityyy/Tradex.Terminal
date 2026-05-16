export const metadata = {
  title: "Privacy Policy - TradeX",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-zinc-400 text-sm mb-8">Last updated: May 2025</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">1. Information We Collect</h2>
        <p className="text-zinc-300 leading-relaxed">
          TradeX collects the following information when you create an account and use our services:
        </p>
        <ul className="list-disc list-inside text-zinc-300 mt-3 space-y-1">
          <li>Email address (for authentication)</li>
          <li>Display name and profile photo (optional, set by you)</li>
          <li>Usage data such as pages visited and features used</li>
          <li>Device information (browser type, operating system)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">2. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-zinc-300 space-y-1">
          <li>To provide and maintain the TradeX service</li>
          <li>To authenticate your account and keep it secure</li>
          <li>To personalize your experience (display name, avatar)</li>
          <li>To send important service notifications</li>
          <li>To improve and develop new features</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">3. Data Storage</h2>
        <p className="text-zinc-300 leading-relaxed">
          Your data is securely stored using Supabase, a cloud database provider. All data is encrypted
          in transit and at rest. We do not sell your personal information to third parties.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">4. Third-Party Services</h2>
        <p className="text-zinc-300 leading-relaxed">
          TradeX uses the following third-party services to deliver market data and functionality:
        </p>
        <ul className="list-disc list-inside text-zinc-300 mt-3 space-y-1">
          <li>Supabase — authentication and database</li>
          <li>Vercel — hosting and deployment</li>
          <li>External market data APIs — for live price feeds and news</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">5. Market Data Disclaimer</h2>
        <p className="text-zinc-300 leading-relaxed">
          TradeX provides market information for educational and informational purposes only. The data
          displayed does not constitute financial advice. Always conduct your own research before making
          any trading decisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">6. Your Rights</h2>
        <p className="text-zinc-300 leading-relaxed">
          You have the right to access, update, or delete your personal data at any time. To request
          deletion of your account and data, contact us at the email below.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-[#5fc77a]">7. Contact</h2>
        <p className="text-zinc-300">
          For privacy-related questions or data deletion requests, contact us at:{" "}
          <a href="mailto:tradex.edgefx@gmail.com" className="text-[#5fc77a] underline">
            tradex.edgefx@gmail.com
          </a>
        </p>
      </section>

      <p className="text-zinc-500 text-sm mt-12 border-t border-white/10 pt-6">
        © 2025 TradeX. All rights reserved.
      </p>
    </div>
  );
}
