"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RespondedLead = {
  id: string;
  item_title: string;
  seller_name: string | null;
  seller_city: string | null;
  seller_state: string | null;
  platform: string | null;
  asking_price: number | null;
  estimated_profit: number | null;
  acquisition_score: number | null;
  outreach_message: string | null;
  outreach_status: string | null;
  status: string | null;
};

export default function SellerResponseQueue() {
  const [leads, setLeads] = useState<RespondedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRespondedLeads() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("seller_leads")
      .select("*")
      .eq("outreach_status", "seller_responded")
      .order("acquisition_score", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLeads(data || []);
    setLoading(false);
  }

  async function updateLead(id: string, updates: any) {
    const { error } = await supabase
      .from("seller_leads")
      .update(updates)
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadRespondedLeads();
  }

  useEffect(() => {
  loadRespondedLeads();
}, []);

  return (
    <section className="rounded-2xl border border-green-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Seller Response Queue</h2>
          <p className="text-sm text-zinc-400">
            Sellers who responded and are ready for approval decision.
          </p>
        </div>

        <button
          onClick={loadRespondedLeads}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-cyan-400">{message}</p>}

      {loading && <p className="text-zinc-400">Loading seller responses...</p>}

      {!loading && leads.length === 0 && (
        <p className="text-zinc-400">No seller responses yet.</p>
      )}

      <div className="space-y-3">
        {leads.map((lead) => (
          <div key={lead.id} className="rounded-xl border border-zinc-800 bg-black p-4 space-y-4">
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
                <p className="font-bold">Score: {lead.acquisition_score ?? 0}</p>
                <p className="text-green-400 text-sm">
                  Est. Profit: ${lead.estimated_profit ?? 0}
                </p>
                <p className="text-zinc-400 text-sm">
                  Asking: ${lead.asking_price ?? 0}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  updateLead(lead.id, {
                    status: "seller_approved",
                    outreach_status: "seller_approved",
                  })
                }
                className="bg-green-500 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Seller Approved
              </button>

              <button
                onClick={() =>
                  updateLead(lead.id, {
                    outreach_status: "follow_up_needed",
                  })
                }
                className="bg-yellow-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Follow-Up Needed
              </button>

              <button
                onClick={() =>
                  updateLead(lead.id, {
                    status: "rejected",
                    outreach_status: "not_interested",
                  })
                }
                className="bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Not Interested
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}