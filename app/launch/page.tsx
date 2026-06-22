"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Listing = {
  id: string | number;
  title: string | null;
  price: number | null;
  image: string | null;
  seller_city: string | null;
  seller_state: string | null;
};

export default function LaunchPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [facebookUrl, setFacebookUrl] = useState("");

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    const { data } = await supabase
      .from("inventory")
      .select("id,title,price,image,seller_city,seller_state,status")
      .eq("status", "active")
      .limit(5);

    setListings(data || []);
  }

  function goToSell() {
    alert("Next step: we will connect this button to the Sell My Item page.");
  }

  function importListing() {
    if (!facebookUrl) {
      alert("Paste your Facebook Marketplace listing URL first.");
      return;
    }

    alert("Next step: this Facebook listing URL will import into DealHaus.");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="text-2xl font-black">
            DealHaus <span className="text-cyan-400">AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-300">
            <a href="#deals" className="hover:text-white">Browse Deals</a>
            <a href="#how" className="hover:text-white">How It Works</a>
            <a href="#sellers" className="hover:text-white">For Sellers</a>
            <a href="#buyers" className="hover:text-white">For Buyers</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>

          <button
            onClick={goToSell}
            className="rounded-xl bg-green-400 px-5 py-3 font-bold text-black"
          >
            Sell My Item
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-cyan-400 text-sm font-bold uppercase tracking-wide">
              AI Marketplace Brokerage
            </p>

            <h1 className="mt-4 text-4xl md:text-6xl font-black leading-tight">
              Sell your items faster without doing all the marketplace work yourself.
            </h1>

            <p className="mt-5 max-w-2xl text-zinc-300 text-lg">
              DealHaus helps local sellers price, list, market, and coordinate
              serious buyer interest for furniture, patio sets, appliances,
              home goods, and other resale items.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={goToSell}
                className="rounded-xl bg-green-400 px-7 py-4 font-bold text-black"
              >
                Sell My Item
              </button>

              <a
                href="#deals"
                className="rounded-xl border border-zinc-700 px-7 py-4 font-bold text-white hover:border-cyan-400"
              >
                Browse Deals
              </a>
            </div>

            <p className="mt-6 text-sm text-zinc-500">
              ✓ No upfront listing fee. DealHaus earns a success commission only when a deal closes.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 shadow-2xl">
            <p className="text-cyan-400 text-sm font-bold uppercase">
              Already Listed?
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Already listed on Facebook Marketplace?
            </h2>

            <p className="mt-3 text-zinc-400">
              Paste your listing link and let DealHaus help you sell it faster.
            </p>

            <input
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://www.facebook.com/marketplace/item/..."
              className="mt-5 w-full rounded-xl border border-zinc-700 bg-black px-4 py-4 text-white"
            />

            <button
              onClick={importListing}
              className="mt-4 w-full rounded-xl bg-green-400 px-6 py-4 font-black text-black"
            >
              Import Listing
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5" id="sellers">
          <InfoCard
            title="We help you sell smarter."
            eyebrow="For Sellers"
            text="We evaluate demand, improve your listing, organize buyer interest, and help move the deal forward."
          />
          <InfoCard
            title="Find better local deals."
            eyebrow="For Buyers"
            text="Browse curated marketplace opportunities without chasing scattered listings across multiple platforms."
          />
          <InfoCard
            title="Less back-and-forth."
            eyebrow="AI Assisted"
            text="DealHaus helps with pricing, outreach, buyer screening, negotiations, and deal tracking."
          />
        </section>

        <section id="how" className="space-y-6">
          <h2 className="text-center text-3xl font-black">How DealHaus Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            <StepCard number="1" title="Submit Item" text="Tell us about your item or paste your listing link." />
            <StepCard number="2" title="We Review" text="DealHaus reviews demand, condition, and pricing." />
            <StepCard number="3" title="We Market It" text="We help position and promote your item." />
            <StepCard number="4" title="We Manage Buyers" text="We help organize inquiries and serious interest." />
            <StepCard number="5" title="You Close Deal" text="You approve the deal. We earn only when it sells." />
          </div>
        </section>

        <section className="rounded-3xl border border-green-900 bg-green-950/20 p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-3xl font-black">Ready to sell or ask about a deal?</h2>
            <p className="mt-2 text-zinc-400">
              Start by submitting your item or browsing available marketplace deals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={goToSell}
              className="rounded-xl bg-green-400 px-6 py-4 font-bold text-black"
            >
              Sell My Item
            </button>

            <a
              href="#deals"
              className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white"
            >
              Browse Deals
            </a>
          </div>
        </section>

        <section id="deals">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-3xl font-black">Latest Active Listings</h2>
            <button className="text-cyan-400 text-sm font-bold">
              View all deals →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {listings.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
              >
                <img
                  src={
                    item.image ||
                    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop"
                  }
                  alt={item.title || "DealHaus listing"}
                  className="h-36 w-full object-cover"
                />

                <div className="p-4">
                  <p className="text-green-400 font-black">
                    ${Number(item.price || 0).toLocaleString()}
                  </p>
                  <h3 className="mt-2 font-bold text-sm leading-snug">
                    {item.title || "DealHaus Listing"}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-500">
                    {item.seller_city || "Location pending"} {item.seller_state || ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="grid grid-cols-1 md:grid-cols-4 gap-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <TrustItem title="Trusted Local Business" text="Built by an experienced local seller serving the community." />
          <TrustItem title="Secure & Private" text="Your information is handled carefully and shared only as needed." />
          <TrustItem title="Only Pay on Success" text="No upfront listing fee. We earn when your item sells." />
          <TrustItem title="Real People, Real Help" text="DealHaus helps coordinate the process with you." />
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-cyan-400 text-sm font-bold">{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-black">{title}</h3>
      <p className="mt-3 text-zinc-400">{text}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="h-9 w-9 rounded-full bg-cyan-400 text-black flex items-center justify-center font-black">
        {number}
      </div>
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function TrustItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  );
}