"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MarketplaceImport = {
  id: string;
  source_name: string | null;
  listing_url: string | null;
  listing_title: string | null;
  listing_price: number | null;
  listing_location: string | null;
  import_status: string | null;
  ai_score: number | null;
  import_notes: string | null;
  created_at: string | null;
};

export default function MarketplaceImportEngine() {
  const [imports, setImports] = useState<MarketplaceImport[]>([]);
  const [form, setForm] = useState({
    source_name: "Facebook Marketplace",
    listing_url: "",
    listing_title: "",
    listing_price: "",
    listing_location: "",
  });
  const [message, setMessage] = useState("");

  async function loadImports() {
    const { data, error } = await supabase
      .from("marketplace_imports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setImports(data || []);
  }

  useEffect(() => {
    loadImports();
  }, []);

  function scoreLead(price: number) {
    if (price >= 500 && price <= 2500) return 92;
    if (price >= 250 && price < 500) return 82;
    if (price > 2500) return 78;
    return 65;
  }

  async function createImport() {
    if (!form.listing_title || !form.listing_price) {
      setMessage("Enter at least listing title and price.");
      return;
    }

    const price = Number(form.listing_price || 0);
    const aiScore = scoreLead(price);

    const { error } = await supabase.from("marketplace_imports").insert({
      source_name: form.source_name,
      listing_url: form.listing_url,
      listing_title: form.listing_title,
      listing_price: price,
      listing_location: form.listing_location,
      import_status: "scored",
      ai_score: aiScore,
      import_notes: `AI scored this opportunity ${aiScore}/100 based on price range and resale potential.`,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      source_name: "Facebook Marketplace",
      listing_url: "",
      listing_title: "",
      listing_price: "",
      listing_location: "",
    });

    setMessage("Marketplace listing imported and scored.");
    await loadImports();
  }

  async function createSellerLead(item: MarketplaceImport) {
    const resalePrice = Number(item.listing_price || 0) * 1.5;
    const commissionRate = 15;
    const commission = Math.round(resalePrice * (commissionRate / 100));

    const { error } = await supabase.from("seller_leads").insert({
      seller_name: "Marketplace Seller",
      seller_email: "seller@example.com",
      seller_phone: "",
      seller_city: item.listing_location || "",
      seller_state: "",
      item_title: item.listing_title,
      item_description: `Imported from ${item.source_name || "marketplace"}.`,
      asking_price: item.listing_price,
      estimated_resale_price: resalePrice,
      estimated_commission: commission,
      lead_source: "Marketplace Import Engine",
      marketplace_source: item.source_name,
      marketplace_listing_url: item.listing_url,
      seller_profile_url: "",
      lead_priority:
        Number(item.ai_score || 0) >= 90
          ? "high"
          : Number(item.ai_score || 0) >= 80
          ? "medium"
          : "low",
      lead_status: "new",
      approval_status: "not_approved",
      agreement_accepted: false,
      commission_rate: commissionRate,
      approval_notes: "",
      acquisition_message: `Hi, I help sellers get more exposure for their marketplace listings without the hassle of managing buyer inquiries. Your ${item.listing_title} looks like a strong fit for our buyer network. We can professionally relist it, handle buyer interest, and only take a commission if it sells.`,
      outreach_notes: "",
      ai_score: item.ai_score,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase
      .from("marketplace_imports")
      .update({ import_status: "sent_to_seller_leads" })
      .eq("id", item.id);

    setMessage("Seller lead created from marketplace import.");
    await loadImports();
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">
          Marketplace Import Engine
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Import Facebook, OfferUp, Craigslist, and other marketplace listings,
          score them, and convert them into seller leads.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-black p-4 mb-5">
        <h3 className="font-bold text-white mb-3">Import Listing</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={form.source_name}
            onChange={(e) =>
              setForm({ ...form, source_name: e.target.value })
            }
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          >
            <option>Facebook Marketplace</option>
            <option>OfferUp</option>
            <option>Craigslist</option>
            <option>Estate Sale</option>
            <option>Local Classifieds</option>
            <option>Other</option>
          </select>

          <input
            value={form.listing_url}
            onChange={(e) =>
              setForm({ ...form, listing_url: e.target.value })
            }
            placeholder="Listing URL"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={form.listing_title}
            onChange={(e) =>
              setForm({ ...form, listing_title: e.target.value })
            }
            placeholder="Listing title"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={form.listing_price}
            onChange={(e) =>
              setForm({ ...form, listing_price: e.target.value })
            }
            placeholder="Listing price"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
          />

          <input
            value={form.listing_location}
            onChange={(e) =>
              setForm({ ...form, listing_location: e.target.value })
            }
            placeholder="Listing location"
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white sm:col-span-2"
          />
        </div>

        <button
          onClick={createImport}
          className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-black hover:bg-cyan-300"
        >
          Import + Score Listing
        </button>
      </div>

      {message && <p className="mb-4 text-sm text-cyan-400">{message}</p>}

      <div className="space-y-4">
        {imports.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-800 bg-black p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-white">
                  {item.listing_title}
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {item.source_name} · {item.listing_location || "No location"}
                </p>
                <p className="text-sm text-green-400 mt-2">
                  Price: ${item.listing_price || 0}
                </p>
                <p className="text-sm text-zinc-500 mt-2">
                  Status: {item.import_status || "pending"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-500">AI Score</p>
                <p className="text-2xl font-bold text-white">
                  {item.ai_score || 0}
                </p>
              </div>
            </div>

            {item.listing_url && (
              <a
                href={item.listing_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-bold text-cyan-400 hover:bg-zinc-800"
              >
                Open Listing
              </a>
            )}

            <div className="mt-3 rounded-lg bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 mb-1">AI Notes</p>
              <p className="text-sm text-zinc-300">
                {item.import_notes || "No notes yet."}
              </p>
            </div>

            <button
              onClick={() => createSellerLead(item)}
              disabled={item.import_status === "sent_to_seller_leads"}
              className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-bold text-black ${
                item.import_status === "sent_to_seller_leads"
                  ? "bg-zinc-600 cursor-not-allowed"
                  : "bg-green-400 hover:bg-green-300"
              }`}
            >
              {item.import_status === "sent_to_seller_leads"
                ? "Already Sent to Seller Leads"
                : "Create Seller Lead"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}