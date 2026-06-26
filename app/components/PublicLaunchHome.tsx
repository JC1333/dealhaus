"use client";

import PublicSellerSubmission from "./PublicSellerSubmission";

type PublicLaunchHomeProps = {
  activeDealCount: number;
  projectedCommission: number;
  setActiveWorkspace: (workspace: string) => void;
};

export default function PublicLaunchHome({
  setActiveWorkspace,
}: PublicLaunchHomeProps) {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-cyan-900 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-8 lg:p-14">
        <p className="text-cyan-400 font-semibold mb-4">
          DealHaus AI Marketplace Brokerage
        </p>

        <h1 className="text-4xl lg:text-6xl font-black tracking-tight max-w-5xl">
          Sell your items faster without doing all the marketplace work yourself.
        </h1>

        <p className="text-zinc-300 text-lg mt-6 max-w-3xl">
          DealHaus helps local sellers price, list, market, and coordinate
          serious buyer interest for furniture, patio sets, appliances.
          home goods, and other marketplace items.
        </p>

        <div className="flex flex-wrap gap-3 mt-8">
          <button
            onClick={() => setActiveWorkspace("global")}
            className="bg-cyan-400 text-black rounded-2xl px-6 py-4 font-bold"
          >
            Sell My Item
          </button>

          <button
            onClick={() => setActiveWorkspace("deals")}
            className="bg-white text-black rounded-2xl px-6 py-4 font-bold"
          >
            Browse Deals
          </button>
        </div>

        <p className="text-sm text-zinc-500 mt-5">
          No upfront listing fee. DealHaus earns a success commission only when
          a deal closes.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-cyan-400 font-bold">For Sellers</p>
          <h3 className="text-2xl font-bold mt-2">We help you sell smarter.</h3>
          <p className="text-zinc-400 mt-3">
            Submit your item and DealHaus helps prepare the listing, evaluate
            buyer demand, and organize serious interest.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-cyan-400 font-bold">For Buyers</p>
          <h3 className="text-2xl font-bold mt-2">Find better local deals.</h3>
          <p className="text-zinc-400 mt-3">
            Browse curated marketplace opportunities and ask about items without
            chasing scattered listings across different platforms.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-cyan-400 font-bold">AI Assisted</p>
          <h3 className="text-2xl font-bold mt-2">Less back-and-forth.</h3>
          <p className="text-zinc-400 mt-3">
            Our system helps organize listings, outreach, buyer interest,
            negotiation steps, and deal tracking behind the scenes.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-cyan-400 font-semibold">Simple Process</p>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">
              How DealHaus Works
            </h2>
          </div>

          <button
            onClick={() => setActiveWorkspace("global")}
            className="bg-green-400 text-black rounded-2xl px-5 py-3 font-bold"
          >
            Start Selling
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-7">
          {[
            ["1", "Submit Item", "Send us basic item details and your asking price."],
            ["2", "Review", "DealHaus reviews demand, condition, and opportunity."],
            ["3", "Prepare Listing", "We help position the item for serious buyers."],
            ["4", "Connect Buyers", "Buyer interest is organized and followed up."],
            ["5", "Close Deal", "DealHaus earns only when the item sells."],
          ].map(([number, title, text]) => (
            <div
              key={number}
              className="rounded-2xl border border-zinc-800 bg-black p-5"
            >
              <div className="h-10 w-10 rounded-full bg-cyan-400 text-black flex items-center justify-center font-black">
                {number}
              </div>

              <p className="font-bold mt-4">{title}</p>
              <p className="text-zinc-400 text-sm mt-2">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-black p-8">
        <p className="text-cyan-400 font-semibold">What We Help Sell</p>
        <h2 className="text-3xl font-black mt-2">Marketplace items with resale demand</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            "Furniture",
            "Patio Sets",
            "Appliances",
            "Home Décor",
            "Electronics",
            "Tools",
            "Collectibles",
            "Local Deals",
          ].map((category) => (
            <div
              key={category}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center font-semibold"
            >
              {category}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-green-900 bg-green-950/20 p-8 lg:p-10">
        <h2 className="text-3xl lg:text-4xl font-black">
          Ready to sell or ask about a deal?
        </h2>

        <p className="text-zinc-300 mt-4 max-w-3xl">
          Start by submitting your item or browsing available marketplace deals.
          DealHaus helps organize the next steps so selling and buying feels
          simpler.
        </p>

        <div className="flex flex-wrap gap-3 mt-7">
          <button
            onClick={() => setActiveWorkspace("global")}
            className="bg-green-400 text-black rounded-2xl px-6 py-4 font-bold"
          >
            Submit Item
          </button>

          <button
            onClick={() => setActiveWorkspace("deals")}
            className="bg-white text-black rounded-2xl px-6 py-4 font-bold"
          >
            Browse Deals
          </button>
        </div>
      </section>

      <PublicSellerSubmission />
      
    </div>
  );
}