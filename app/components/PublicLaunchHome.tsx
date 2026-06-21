"use client";

type PublicLaunchHomeProps = {
  activeDealCount: number;
  projectedCommission: number;
  setActiveWorkspace: (workspace: string) => void;
};

export default function PublicLaunchHome({
  activeDealCount,
  projectedCommission,
  setActiveWorkspace,
}: PublicLaunchHomeProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-cyan-900 bg-gradient-to-br from-zinc-950 to-black p-8 lg:p-12">
        <p className="text-cyan-400 font-semibold mb-3">
          DealHaus AI Marketplace
        </p>

        <h1 className="text-4xl lg:text-6xl font-black tracking-tight max-w-4xl">
          Sell faster. Find better local deals. Let AI do the heavy lifting.
        </h1>

        <p className="text-zinc-400 text-lg mt-5 max-w-3xl">
          DealHaus helps local sellers get more exposure and helps buyers find
          quality furniture and marketplace deals without the back-and-forth.
        </p>

        <div className="flex flex-wrap gap-3 mt-8">
          <button
            onClick={() => setActiveWorkspace("global")}
            className="bg-cyan-400 text-black rounded-2xl px-6 py-4 font-bold"
          >
            Submit Item to Sell
          </button>

          <button
            onClick={() => setActiveWorkspace("deals")}
            className="bg-white text-black rounded-2xl px-6 py-4 font-bold"
          >
            View Available Deals
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <h2 className="text-3xl font-bold">How DealHaus Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <p className="text-cyan-400 font-bold">1. Sellers Submit</p>
            <p className="text-zinc-400 mt-2">
              Sellers submit furniture or marketplace items they want help
              selling.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <p className="text-cyan-400 font-bold">2. AI Creates the Listing</p>
            <p className="text-zinc-400 mt-2">
              DealHaus analyzes the item, prepares listing details, and helps
              match likely buyers.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <p className="text-cyan-400 font-bold">3. DealHaus Coordinates</p>
            <p className="text-zinc-400 mt-2">
              We help coordinate serious interest and earn a commission only
              when the deal closes.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-green-900 bg-green-950/20 p-8">
        <h2 className="text-3xl font-bold">Ready to sell an item?</h2>
        <p className="text-zinc-300 mt-3">
          Submit your item and DealHaus will review it for marketplace demand,
          buyer interest, and resale opportunity.
        </p>

        <button
          onClick={() => setActiveWorkspace("global")}
          className="mt-6 bg-green-400 text-black rounded-2xl px-6 py-4 font-bold"
        >
          Start Seller Submission
        </button>
      </section>
    </div>
  );
}