"use client";

type HeroSectionProps = {
  facebookUrl: string;
  setFacebookUrl: (url: string) => void;
  onImportListing: () => void;
};

export default function HeroSection({
  facebookUrl,
  setFacebookUrl,
  onImportListing,
}: HeroSectionProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
      <div>
        <p className="text-cyan-400 text-sm font-bold uppercase tracking-wide">
          DealHaus · AI Marketplace Brokerage
        </p>

        <h1 className="mt-4 text-4xl md:text-5xl xl:text-6xl font-black leading-tight">
          Sell Smarter with DealHaus
        </h1>

        <p className="mt-5 max-w-2xl text-zinc-300 text-lg">
          Helping local sellers reach more buyers with honest, success-based marketplace support.
        </p>

        <p className="mt-5 text-cyan-400 font-semibold">
         Helping You Sell Smarter. Built on Integrity. Guided by Faith. 
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="/submit"
            className="rounded-xl bg-green-400 px-7 py-4 font-bold text-black"
          >
            Get My Item Reviewed
          </a>

          <a
            href="/marketplace"
            className="rounded-xl border border-zinc-700 px-7 py-4 font-bold text-white hover:border-cyan-400"
          >
            Browse Deals
          </a>
        </div>

        <p className="mt-6 text-sm text-zinc-500">
          ✓ No upfront listing fee. DealHaus earns a success commission only
          when a deal closes.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 shadow-2xl">
        <p className="text-cyan-400 text-sm font-bold uppercase">
          Already Selling Somewhere?
        </p>

        <h2 className="mt-3 text-2xl font-black">
          Paste your existing marketplace listing.
        </h2>

        <p className="mt-3 text-zinc-400">
          Facebook Marketplace, OfferUp, or Craigslist. DealHaus will review it
          and help you reach more qualified buyers.
        </p>

        <input
          value={facebookUrl}
          onChange={(e) => setFacebookUrl(e.target.value)}
          placeholder="https://www.facebook.com/marketplace/item/..."
          className="mt-5 w-full rounded-xl border border-zinc-700 bg-black px-4 py-4 text-white"
        />

        <button
          onClick={onImportListing}
          className="mt-4 w-full rounded-xl bg-green-400 px-6 py-4 font-black text-black"
        >
          Import Listing
        </button>
      </div>
    </section>
  );
}