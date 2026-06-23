export default function FAQPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <a href="/launch" className="text-cyan-400 font-bold">
          ← Back to DealHaus
        </a>

        <h1 className="mt-8 text-4xl md:text-5xl font-black">
          Frequently Asked Questions
        </h1>

        <p className="mt-4 text-zinc-400">
          Answers to common questions about selling, buying, fees, and how DealHaus works.
        </p>

        <div className="mt-8 space-y-4">
          {[
            ["How much does DealHaus cost?", "There is no upfront listing fee. DealHaus earns a success-based commission only when your item sells."],
            ["Do I still own my item?", "Yes. You keep ownership unless you choose to complete a sale."],
            ["Can I still sell it myself?", "Yes. DealHaus helps market and coordinate interest, but you may still sell it directly."],
            ["What items do you accept?", "Furniture, patio sets, appliances, home goods, tools, electronics, and other local resale items with strong demand."],
            ["What areas do you serve?", "DealHaus is currently focused on Las Vegas, with plans to expand."],
            ["Is DealHaus only furniture?", "No. DealHaus is built as an AI-powered local marketplace brokerage for multiple categories."],
          ].map(([q, a]) => (
            <div key={q} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-black">{q}</h2>
              <p className="mt-2 text-zinc-400">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}