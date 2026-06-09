"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OutreachTask = {
  id: string;
  seller_lead_id: string | null;
  item_title: string | null;
  seller_name: string | null;
  platform: string | null;
  outreach_message: string | null;
  send_status: string | null;
  attempt_count: number | null;
  created_at: string | null;
};

export default function OutreachTaskQueue() {
  const [tasks, setTasks] = useState<OutreachTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTasks() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("outreach_tasks")
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

  async function copyMessage(messageText: string | null) {
    if (!messageText) {
      setMessage("No outreach message saved.");
      return;
    }

    await navigator.clipboard.writeText(messageText);
    setMessage("Message copied.");
  }

  async function markSent(task: OutreachTask) {
  const { error } = await supabase
    .from("outreach_tasks")
    .update({
      send_status: "awaiting_response",
      attempt_count: (task.attempt_count || 0) + 1,
    })
    .eq("id", task.id);

  if (error) {
    setMessage(error.message);
    return;
  }

  await loadTasks();
}

async function sellerReplied(task: OutreachTask) {
  const { error: taskError } = await supabase
    .from("outreach_tasks")
    .update({
      send_status: "seller_replied",
    })
    .eq("id", task.id);

  if (taskError) {
    setMessage(taskError.message);
    return;
  }

  if (task.seller_lead_id) {
    await supabase
      .from("seller_leads")
      .update({
        outreach_status: "seller_responded",
      })
      .eq("id", task.seller_lead_id);
  }

  await loadTasks();
}

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <section className="rounded-2xl border border-blue-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Outreach Task Queue</h2>
          <p className="text-sm text-zinc-400">
            Phase 2 seller outreach tasks created from approved seller leads.
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

      {loading && <p className="text-zinc-400">Loading outreach tasks...</p>}

      {!loading && tasks.length === 0 && (
        <p className="text-zinc-400">No outreach tasks yet.</p>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-zinc-800 bg-black p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="font-bold text-lg">
                  {task.item_title || "Untitled Lead"}
                </p>
                <p className="text-sm text-zinc-400">
                  {task.seller_name || "Unknown Seller"} ·{" "}
                  {task.platform || "Unknown Platform"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">Status: {task.send_status || "pending"}</p>
                <p className="text-sm text-zinc-400">
                  Attempts: {task.attempt_count || 0}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Outreach Message
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
                  onClick={() => markSent(task)}
                  className="bg-blue-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Mark Sent / Awaiting Response
                   </button>

                  <button
  onClick={() => sellerReplied(task)}
  className="bg-green-500 text-black rounded-xl px-4 py-2 text-sm font-semibold"
>
  Seller Replied
</button>
            
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}