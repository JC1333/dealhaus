"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Listing = {
  id: string | number;
  title: string | null;
  description: string | null;
  price: number | null;
  image: string | null;
  seller_city: string | null;
  seller_state: string | null;
};

export default function ListingDetailPage() {
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    loadListing();
  }, []);

  async function loadListing() {
    const { data } = await supabase
      .from("inventory")
      .select("id,title,description,price,image,seller_city,seller_state")
      .eq("id", params.id)
      .single();

    setListing(data);
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        Loading listing...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <a href="/marketplace" className="text-cyan-400 font-bold">
          ← Back to Browse Deals
        </a>

        <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <img
            src={
              listing.image ||
              "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop"
            }
            alt={listing.title || "DealHaus listing"}
            className="h-80 w-full object-cover"
          />

          <div className="p-7">
            <p className="text-3xl font-black text-green-400">
              ${Number(listing.price || 0).toLocaleString()}
            </p>

            <h1 className="mt-3 text-4xl font-black">
              {listing.title || "DealHaus Listing"}
            </h1>

            <p className="mt-3 text-zinc-400">
              {listing.seller_city || "Location pending"} {listing.seller_state || ""}
            </p>

            <p className="mt-6 text-zinc-300">
              {listing.description || "Details coming soon."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`mailto:hello@dealhaus.ai?subject=Interested in ${listing.title}`}
                className="rounded-xl bg-cyan-400 px-6 py-4 font-black text-black"
              >
                Request Info
              </a>

              <a
                href="/marketplace"
                className="rounded-xl border border-zinc-700 px-6 py-4 font-bold text-white"
              >
                Browse More Deals
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}