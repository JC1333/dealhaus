"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HeroSection from "../components/public/HeroSection";

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
  .order("id", { ascending: false })
  .limit(5);

    setListings(data || []);
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
          <div className="text-4xl md:text-5xl font-black tracking-tight">
  DealHaus <span className="text-cyan-400">AI</span>
</div>

          <nav className="hidden md:flex items-center gap-10 text-lg font-semibold text-zinc-300">
      <a href="#deals" className="hover:text-white">
  Browse
</a>

<a href="/submit" className="hover:text-white">
  Sell
</a>

<a href="#how" className="hover:text-white">
  How It Works
</a>

<a href="#about" className="hover:text-white">
  About
</a>

<a href="#contact" className="hover:text-white">
  Contact
</a>
          </nav>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
       <HeroSection
  facebookUrl={facebookUrl}
  setFacebookUrl={setFacebookUrl}
  onImportListing={importListing}
/>

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

            <a
              href="#deals"
              className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white"
            >
              Browse Deals
            </a>
          </div>
        </section>
<section
  id="about"
  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7"
>
  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
    <div>
      <p className="text-cyan-400 text-sm font-bold uppercase">
        Why Sellers Choose DealHaus
      </p>

      <h2 className="mt-2 text-3xl font-black">
        Marketplace selling, made easier.
      </h2>
    </div>

    <p className="max-w-2xl text-zinc-400">
      DealHaus helps sellers save time, improve presentation, organize buyer
      interest, and move listings forward with a success-based approach.
    </p>
  </div>

  <div className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[
      ["No Upfront Listing Fee", "Submit your item for review without paying before it sells."],
      ["AI-Assisted Pricing", "We help evaluate pricing, demand, and resale opportunity."],
      ["Marketplace Reach", "DealHaus can help support Facebook Marketplace, OfferUp, Craigslist, and more."],
      ["Buyer Interest Organized", "We help track serious interest and reduce unnecessary back-and-forth."],
      ["Built on Integrity", "Clear communication, honest expectations, and a service-first approach."],
      ["Success-Based Commission", "DealHaus earns only when a deal successfully closes."],
    ].map(([title, text]) => (
      <div
        key={title}
        className="rounded-2xl border border-zinc-800 bg-black p-5"
      >
        <p className="text-green-400 font-black">✓ {title}</p>
        <p className="mt-2 text-sm text-zinc-400">{text}</p>
      </div>
    ))}
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