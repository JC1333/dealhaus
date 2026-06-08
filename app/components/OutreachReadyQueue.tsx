"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReadyLead = {
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

export default function OutreachReadyQueue() {
  const [leads, setLeads] = useState<ReadyLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReadyLeads() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("seller_leads")
      .select("*")
      .eq("status", "approved_for_outreach")
      .eq("outreach_status", "ready")
      .order("acquisition_score", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLeads(data || []);
    setLoading(false);
  }

  async function copyMessage(messageText: string | null) {
    if (!messageText) {
      setMessage("No message saved yet.");
      return;
    }

    await navigator.clipboard.writeText(messageText);
    setMessage("Message copied.");
  }

  async function markContacted(id: string) {
    const { error } = await supabase
      .from("seller_leads")
      .update({ outreach_status: "contacted" })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadReadyLeads();
  }

  useEffect(() => {
  loadReadyLeads();
}, []);

  return (
    <section className="rounded-2xl border border-cyan-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Outreach Ready Queue</h2>
          <p className="text-sm text-zinc-400">
            Approved seller leads with saved messages ready to contact.
          </p>
        </div>

        <button
          onClick={loadReadyLeads}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-cyan-400">{message}</p>}

      {loading && <p className="text-zinc-400">Loading outreach-ready leads...</p>}

      {!loading && leads.length === 0 && (
        <p className="text-zinc-400">No outreach-ready leads yet.</p>
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

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Outreach Message
              </p>

              <p className="text-sm text-zinc-200">
                {lead.outreach_message || "No message saved."}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyMessage(lead.outreach_message)}
                  className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Copy Message
                </button>

                <button
                  onClick={() => markContacted(lead.id)}
                  className="bg-cyan-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Mark Contacted
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}