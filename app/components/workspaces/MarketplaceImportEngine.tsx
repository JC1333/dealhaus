"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MarketplaceImport = {
  id: string;
  source_name: string | null;
  listing_url: string | null;
  listing_title: string | null;
  listing_description: string | null;
  listing_price: number | null;
  listing_location: string | null;
  image_urls: string[] | null;
  category: string | null;
  item_condition: string | null;
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
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

  const [sellerDetails, setSellerDetails] = useState({
  sellerName: "",
  sellerEmail: "",
  sellerPhone: "",
  sellerCity: "",
  sellerState: "",
  sellerZip: "",
  preferredContact: "text",
});
  async function loadImports() {
    const { data, error } = await supabase
  .from("marketplace_imports")
  .select("*")
  .neq("import_status", "confirmed")
  .neq("import_status", "sent_to_seller_leads")
  .neq("import_status", "archived")
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
  const sellerName = sellerDetails.sellerName.trim();
  const sellerEmail = sellerDetails.sellerEmail.trim().toLowerCase();
  const sellerPhone = sellerDetails.sellerPhone.trim();
  const sellerCity = sellerDetails.sellerCity.trim();
  const sellerState = sellerDetails.sellerState.trim();
  const sellerZip = sellerDetails.sellerZip.trim();

  if (
    !sellerName ||
    !sellerEmail ||
    !sellerPhone ||
    !sellerCity ||
    !sellerState
  ) {
    setMessage(
      "Enter seller name, email, phone, city, and state before creating the seller lead."
    );
    return;
  }

  const price = Number(item.listing_price || 0);

  const { error: leadError } = await supabase
    .from("seller_leads")
    .insert({
      seller_name: sellerName,
      seller_email: sellerEmail,
      seller_phone: sellerPhone,
      seller_city: sellerCity,
      seller_state: sellerState,
      seller_zip: sellerZip || null,
      preferred_contact_method: sellerDetails.preferredContact,
      item_title: item.listing_title || "Marketplace Listing",
      item_description: item.listing_description || "",
      asking_price: price,
      lead_source: item.source_name
        ? `${item.source_name} Import`
        : "Marketplace Import",
      marketplace_source: item.source_name,
      marketplace_listing_url: item.listing_url,
      lead_status: "new",
      status: "new",
      approval_status: "not_approved",
      agreement_accepted: false,
      commission_rate: 10,
      ai_score: item.ai_score || 80,
      acquisition_score: item.ai_score || 80,
      lead_priority:
        Number(item.ai_score || 0) >= 90
          ? "high"
          : Number(item.ai_score || 0) >= 80
          ? "medium"
          : "low",
      outreach_status: "not_contacted",
      photo_urls: Array.isArray(item.image_urls)
        ? item.image_urls
        : [],
    });

  if (leadError) {
    setMessage(leadError.message);
    return;
  }

  const { error: importError } = await supabase
    .from("marketplace_imports")
    .update({
      seller_name: sellerName,
      seller_email: sellerEmail,
      seller_phone: sellerPhone,
      seller_city: sellerCity,
      seller_state: sellerState,
      seller_zip: sellerZip || null,
      preferred_contact_method: sellerDetails.preferredContact,
      seller_confirmed: true,
      import_status: "sent_to_seller_leads",
      import_notes:
        "Seller information confirmed and seller lead created.",
    })
    .eq("id", item.id);

  if (importError) {
    setMessage(importError.message);
    return;
  }

  setSelectedImportId(null);

  setSellerDetails({
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    sellerCity: "",
    sellerState: "",
    sellerZip: "",
    preferredContact: "text",
  });

  setMessage("Seller lead created successfully.");

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

            {selectedImportId === item.id ? (
  <div className="mt-4 space-y-3 rounded-xl border border-green-800 bg-green-950/20 p-4">
    <p className="font-bold text-green-400">
      Confirm Seller Information
    </p>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <input
        value={sellerDetails.sellerName}
        onChange={(e) =>
          setSellerDetails({
            ...sellerDetails,
            sellerName: e.target.value,
          })
        }
        placeholder="Seller name"
        className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
      />

      <input
        type="email"
        value={sellerDetails.sellerEmail}
        onChange={(e) =>
          setSellerDetails({
            ...sellerDetails,
            sellerEmail: e.target.value,
          })
        }
        placeholder="Seller email"
        className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
      />

      <input
        value={sellerDetails.sellerPhone}
        onChange={(e) =>
          setSellerDetails({
            ...sellerDetails,
            sellerPhone: e.target.value,
          })
        }
        placeholder="Seller phone"
        className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
      />

      <select
        value={sellerDetails.preferredContact}
        onChange={(e) =>
          setSellerDetails({
            ...sellerDetails,
            preferredContact: e.target.value,
          })
        }
        className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
      >
        <option value="text">Text</option>
        <option value="call">Call</option>
        <option value="email">Email</option>
      </select>

      <input
        value={sellerDetails.sellerCity}
        onChange={(e) =>
          setSellerDetails({
            ...sellerDetails,
            sellerCity: e.target.value,
          })
        }
        placeholder="City"
        className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
      />

      <input
        value={sellerDetails.sellerState}
        onChange={(e) =>
          setSellerDetails({
            ...sellerDetails,
            sellerState: e.target.value,
          })
        }
        placeholder="State"
        className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
      />

      <input
        value={sellerDetails.sellerZip}
        onChange={(e) =>
          setSellerDetails({
            ...sellerDetails,
            sellerZip: e.target.value,
          })
        }
        placeholder="ZIP code"
        className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white md:col-span-2"
      />
    </div>

    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => createSellerLead(item)}
        className="flex-1 rounded-xl bg-green-400 px-4 py-3 text-sm font-bold text-black hover:bg-green-300"
      >
        Confirm + Create Seller Lead
      </button>

      <button
        type="button"
        onClick={() => setSelectedImportId(null)}
        className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-white"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <button
    type="button"
    onClick={() => {
      setSelectedImportId(item.id);

      setSellerDetails({
        sellerName: "",
        sellerEmail: "",
        sellerPhone: "",
        sellerCity: item.listing_location || "",
        sellerState: "",
        sellerZip: "",
        preferredContact: "text",
      });

      setMessage("");
    }}
    className="mt-3 w-full rounded-xl bg-green-400 px-4 py-3 text-sm font-bold text-black hover:bg-green-300"
  >
    Create Seller Lead
  </button>
)}
          </div>
        ))}
      </div>
    </section>
  );
}