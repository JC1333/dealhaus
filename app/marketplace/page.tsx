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

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    const { data } = await supabase
      .from("inventory")
      .select("id,title,price,image,seller_city,seller_state,status")
      .eq("status", "active")
      .order("id", { ascending: false })
      .limit(50);

    setListings(data || []);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <a href="/launch" className="text-cyan-400 font-bold">
          ← Back to DealHaus
        </a>

        <h1 className="mt-8 text-4xl md:text-5xl font-black">
          Browse Deals
        </h1>

        <p className="mt-3 text-zinc-400">
          Browse active DealHaus marketplace listings.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {listings.map((item) => (
            <a
              key={item.id}
              href={`/marketplace/${item.id}`}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-cyan-500"
            >
              <img
                src={
                  item.image ||
                  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop"
                }
                alt={item.title || "DealHaus listing"}
                className="h-44 w-full object-cover"
              />

              <div className="p-4">
                <p className="text-green-400 font-black">
                  ${Number(item.price || 0).toLocaleString()}
                </p>

                <h2 className="mt-2 font-bold leading-snug">
                  {item.title || "DealHaus Listing"}
                </h2>

                <p className="mt-2 text-xs text-zinc-500">
                  {item.seller_city || "Location pending"} {item.seller_state || ""}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}