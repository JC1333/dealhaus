"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SellerLead = {
  id: string;
  item_title: string;
  seller_name: string;
  seller_city: string;
  seller_state: string;
  asking_price: number | null;
  estimated_profit: number | null;
  acquisition_score: number | null;
  acquisition_reason: string | null;
  platform: string | null;
  outreach_message: string | null;
  status: string | null;
};

export default function SellerLeadQueue() {
  const [leads, setLeads] = useState<SellerLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadLeads() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("seller_leads")
      .select("*")
      .order("acquisition_score", { ascending: false })
      .limit(5);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLeads(data || []);
    setLoading(false);
  }
async function copyMessage(message: string | null) {
  if (!message) {
    setMessage("No outreach message saved yet.");
    return;
  }

  await navigator.clipboard.writeText(message);
  setMessage("Outreach message copied.");
}
  async function updateLeadStatus(id: string, status: string) {
  setMessage("");

  const res = await fetch("/api/seller-lead-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });

  const data = await res.json();

  if (!res.ok) {
    setMessage(data.error || "Could not update lead status");
    return;
  }

  await loadLeads();
}

  useEffect(() => {
    loadLeads();
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Seller Lead Queue</h2>
          <p className="text-sm text-zinc-400">
            Review AI-scored seller leads and move the best ones toward outreach.
          </p>
        </div>

        <button
          onClick={loadLeads}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-zinc-400">Loading seller leads...</p>}

      {message && <p className="text-red-400">{message}</p>}

      {!loading && leads.length === 0 && (
        <p className="text-zinc-400">No seller leads found yet.</p>
      )}

      <div className="space-y-3">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="rounded-xl border border-zinc-800 bg-black p-4 space-y-3"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="font-bold text-lg">{lead.item_title}</p>
                <p className="text-sm text-zinc-400">
                  {lead.seller_name || "Unknown Seller"} ·{" "}
                  {lead.seller_city || "Unknown City"},{" "}
                  {lead.seller_state || ""} · {lead.platform || "Unknown Platform"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">
                  Score: {lead.acquisition_score ?? 0}
                </p>
                <p className="text-green-400 text-sm">
                  Est. Profit: ${lead.estimated_profit ?? 0}
                </p>
                <p className="text-zinc-400 text-sm">
                  Asking: ${lead.asking_price ?? 0}
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-300">
              {lead.acquisition_reason || "No acquisition reason saved."}
            </p>
            {lead.outreach_message && (
  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
    <p className="text-xs uppercase tracking-wide text-zinc-500">
      Saved Outreach Message
    </p>

    <p className="text-sm text-zinc-200">
      {lead.outreach_message}
    </p>

    <button
      onClick={() => copyMessage(lead.outreach_message)}
      className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold"
    >
      Copy Message
    </button>
  </div>
)}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateLeadStatus(lead.id, "approved_for_outreach")}
                className="bg-green-500 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Approve for Outreach
              </button>

              <button
                onClick={() => updateLeadStatus(lead.id, "needs_review")}
                className="bg-yellow-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Needs Review
              </button>

              <button
                onClick={() => updateLeadStatus(lead.id, "rejected")}
                className="bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Reject
              </button>

              <span className="text-sm text-zinc-400 flex items-center">
                Current Status: {lead.status || "new"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}