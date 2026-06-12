"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BuyerOutreachTask = {
  id: string;
  inventory_item_id: number | null;
  item_title: string | null;
  listing_price: number | null;
  buyer_name: string | null;
  buyer_platform: string | null;
  outreach_message: string | null;
  outreach_status: string | null;
  created_at: string | null;
};

export default function BuyerOutreachTaskQueue() {
  const [tasks, setTasks] = useState<BuyerOutreachTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTasks() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("buyer_outreach_tasks")
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

  async function copyMessage(text: string | null) {
    if (!text) {
      setMessage("No buyer outreach message saved.");
      return;
    }

    await navigator.clipboard.writeText(text);
    setMessage("Buyer outreach message copied.");
  }

 async function updateStatus(id: string, outreach_status: string) {
  const task = tasks.find((t) => t.id === id);

  const { error } = await supabase
    .from("buyer_outreach_tasks")
    .update({ outreach_status })
    .eq("id", id);

  if (error) {
    setMessage(error.message);
    return;
  }

  if (
    outreach_status === "ready_for_negotiation" &&
    task
  ) 
 {
  const { data: existingNegotiation } = await supabase
    .from("negotiation_tasks")
    .select("id")
    .eq("buyer_outreach_task_id", task.id)
    .limit(1)
    .single();

  if (existingNegotiation) {
    setMessage("Negotiation task already exists.");
  } else {
    await supabase
      .from("negotiation_tasks")
      .insert({
        buyer_outreach_task_id: task.id,
        inventory_item_id: task.inventory_item_id,
        item_title: task.item_title,
        buyer_name: task.buyer_name,
        listing_price: task.listing_price,
        current_offer: task.listing_price,
        negotiation_status: "pending",
      });
  }
}
  await loadTasks();
}

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <section className="rounded-2xl border border-cyan-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Buyer Outreach Task Queue</h2>
          <p className="text-sm text-zinc-400">
            Buyer outreach tasks created from buyer matches and active inventory.
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

      {loading && <p className="text-zinc-400">Loading buyer outreach tasks...</p>}

      {!loading && tasks.length === 0 && (
        <p className="text-zinc-400">No buyer outreach tasks yet.</p>
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
                  {task.buyer_name || "Unknown Buyer"} ·{" "}
                  {task.buyer_platform || "Unknown Platform"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">
                  Status: {task.outreach_status || "pending"}
                </p>
                <p className="text-green-400 text-sm">
                  Price: ${task.listing_price ?? 0}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Buyer Outreach Message
              </p>

              <p className="text-sm text-zinc-200">
                {task.outreach_message || "No outreach message saved."}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyMessage(task.outreach_message)}
                  className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Copy Message
                </button>

                <button
                  onClick={() => updateStatus(task.id, "buyer_contacted")}
                  className="bg-yellow-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Buyer Contacted
                </button>

                <button
                  onClick={() => updateStatus(task.id, "buyer_responded")}
                  className="bg-purple-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Buyer Responded
                </button>

                <button
                  onClick={() => updateStatus(task.id, "ready_for_negotiation")}
                  className="bg-green-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Ready for Negotiation
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}