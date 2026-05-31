export const metadata = {
  title: "Refund Policy — TradeX Terminal",
  description: "Refund Policy for TradeX Terminal",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: May 31, 2026</p>
        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. No Refund Policy</h2>
            <p>All payments made for TradeX Terminal subscriptions are <strong className="text-white">final and non-refundable</strong>. By completing a purchase and subscribing to the Service, you acknowledge and agree that you will not receive a refund for any subscription fees already charged to your account, regardless of whether you use the Service during that billing period.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Subscription Cancellation</h2>
            <p>You may cancel your subscription at any time through your account settings. Upon cancellation, your Pro access will remain active until the end of the current billing period. No partial refunds are issued for unused time remaining in a billing cycle.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Your Responsibility</h2>
            <p>By subscribing, you confirm that you have reviewed the features of TradeX Terminal and made an informed decision to subscribe. You accept full responsibility for your purchasing decision. We encourage you to make use of any free trial period before committing to a paid subscription.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Exceptions</h2>
            <p>Refunds will only be considered in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>A duplicate charge was made due to a technical error on our end.</li>
              <li>You were charged after a confirmed cancellation.</li>
            </ul>
            <p className="mt-3">In these cases, please contact us within 7 days of the charge at <a href="mailto:tradex.edgefx@gmail.com" className="text-[#5fc77a] underline">tradex.edgefx@gmail.com</a> with your account email and a description of the issue. We will investigate and resolve billing errors promptly.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Chargebacks</h2>
            <p>Initiating a chargeback or payment dispute without first contacting us to resolve the issue may result in the immediate suspension of your account. We encourage you to reach out directly — most billing concerns can be resolved quickly.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Contact Us</h2>
            <p>For any billing questions or concerns, please reach out to us:</p>
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
