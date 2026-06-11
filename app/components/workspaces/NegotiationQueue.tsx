"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NegotiationTask = {
  id: string;
  buyer_outreach_task_id: string | null;
  inventory_item_id: number | null;
  item_title: string | null;
  buyer_name: string | null;
  listing_price: number | null;
  current_offer: number | null;
  negotiation_status: string | null;
  created_at: string | null;
};

export default function NegotiationQueue() {
  const [tasks, setTasks] = useState<NegotiationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTasks() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("negotiation_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setTasks(data || []);
    setLoading(false);
  }

  async function updateNegotiation(id: string, negotiation_status: string) {
    const { error } = await supabase
      .from("negotiation_tasks")
      .update({ negotiation_status })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadTasks();
  }
  async function acceptOffer(task: NegotiationTask) {
  const { error } = await supabase
    .from("negotiation_tasks")
    .update({ negotiation_status: "offer_accepted" })
    .eq("id", task.id);

  if (error) {
    setMessage(error.message);
    return;
  }

  if (task.inventory_item_id) {
    const { error: inventoryError } = await supabase
      .from("inventory")
      .update({
        ready_to_close: true,
        deal_stage: "ready_to_close",
      })
      .eq("id", task.inventory_item_id);

    if (inventoryError) {
      setMessage(inventoryError.message);
      return;
    }
  }

  await loadTasks();
}

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <section className="rounded-2xl border border-orange-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Negotiation Queue</h2>
          <p className="text-sm text-zinc-400">
            Buyer negotiations created from ready buyer outreach tasks.
          </p>
        </div>

        <button
          onClick={loadTasks}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-cyan-400">{message}</p>}

      {loading && <p className="text-zinc-400">Loading negotiations...</p>}

      {!loading && tasks.length === 0 && (
        <p className="text-zinc-400">No negotiations yet.</p>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-zinc-800 bg-black p-4 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="font-bold text-lg">
                  {task.item_title || "Untitled Item"}
                </p>
                <p className="text-sm text-zinc-400">
                  Buyer: {task.buyer_name || "Unknown Buyer"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">
                  Status: {task.negotiation_status || "pending"}
                </p>
                <p className="text-green-400 text-sm">
                  Listing Price: ${task.listing_price ?? 0}
                </p>
                <p className="text-cyan-400 text-sm">
                  Current Offer: ${task.current_offer ?? 0}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateNegotiation(task.id, "buyer_offer_received")}
                className="bg-yellow-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Buyer Offer Received
              </button>

              <button
                onClick={() => updateNegotiation(task.id, "counter_offer_sent")}
                className="bg-purple-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Counter Offer Sent
              </button>

              <button
                onClick={() => acceptOffer(task)}
                className="bg-green-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Offer Accepted
              </button>

              <button
                onClick={() => updateNegotiation(task.id, "offer_rejected")}
                className="bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Offer Rejected
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}