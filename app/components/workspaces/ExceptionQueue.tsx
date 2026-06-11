"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ExceptionTask = {
  id: string;
  exception_type: string | null;
  related_table: string | null;
  related_record_id: string | null;
  item_title: string | null;
  exception_status: string | null;
  notes: string | null;
  created_at: string | null;
};

export default function ExceptionQueue() {
  const [exceptions, setExceptions] = useState<ExceptionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadExceptions() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("exception_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setExceptions(data || []);
    setLoading(false);
  }

  async function updateException(id: string, exception_status: string) {
    const { error } = await supabase
      .from("exception_tasks")
      .update({ exception_status })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadExceptions();
  }

  useEffect(() => {
    loadExceptions();
  }, []);

  return (
    <section className="rounded-2xl border border-red-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Exception Queue</h2>
          <p className="text-sm text-zinc-400">
            Tracks stalled, failed, duplicate, or disputed workflow items.
          </p>
        </div>

        <button
          onClick={loadExceptions}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-red-500"
        >
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-red-400">{message}</p>}

      {loading && <p className="text-zinc-400">Loading exceptions...</p>}

      {!loading && exceptions.length === 0 && (
        <p className="text-zinc-400">No exceptions currently open.</p>
      )}

      <div className="space-y-3">
        {exceptions.map((exception) => (
          <div
            key={exception.id}
            className="rounded-xl border border-zinc-800 bg-black p-4 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="font-bold text-lg">
                  {exception.item_title || "Untitled Exception"}
                </p>
                <p className="text-sm text-zinc-400">
                  Type: {exception.exception_type || "unknown"}
                </p>
                <p className="text-sm text-zinc-500">
                  Source: {exception.related_table || "unknown"} ·{" "}
                  {exception.related_record_id || "no record id"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">
                  Status: {exception.exception_status || "open"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs text-zinc-500 mb-2">Notes</p>
              <p className="text-sm text-zinc-300">
                {exception.notes || "No notes saved."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateException(exception.id, "reviewing")}
                className="bg-yellow-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Reviewing
              </button>

              <button
                onClick={() => updateException(exception.id, "resolved")}
                className="bg-green-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Resolved
              </button>

              <button
                onClick={() => updateException(exception.id, "ignored")}
                className="bg-zinc-700 text-white rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Ignore
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}