"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RevenueRecord = {
  id: string;
  inventory_item_id: number | null;
  item_title: string | null;
  sale_price: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  seller_payout: number | null;
  revenue_status: string | null;
  created_at: string | null;
};

export default function RevenueQueue() {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRecords() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("revenue_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setRecords(data || []);
    setLoading(false);
  }

  async function updateRevenueStatus(id: string, revenue_status: string) {
    const { error } = await supabase
      .from("revenue_records")
      .update({ revenue_status })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadRecords();
  }

  useEffect(() => {
    loadRecords();
  }, []);

  return (
    <section className="rounded-2xl border border-green-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Revenue Queue</h2>
          <p className="text-sm text-zinc-400">
            Track commission revenue, seller payout, and closed deal status.
          </p>
        </div>

        <button
          onClick={loadRecords}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-cyan-400">{message}</p>}

      {loading && <p className="text-zinc-400">Loading revenue records...</p>}

      {!loading && records.length === 0 && (
        <p className="text-zinc-400">No revenue records yet.</p>
      )}

      <div className="space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="rounded-xl border border-zinc-800 bg-black p-4 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="font-bold text-lg">
                  {record.item_title || "Untitled Item"}
                </p>
                <p className="text-sm text-zinc-400">
                  Inventory ID: {record.inventory_item_id || "N/A"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">
                  Status: {record.revenue_status || "pending"}
                </p>
                <p className="text-green-400 text-sm">
                  Commission: ${record.commission_amount ?? 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">Sale Price</p>
                <p className="text-xl font-bold">${record.sale_price ?? 0}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">Commission Rate</p>
                <p className="text-xl font-bold">{record.commission_rate ?? 10}%</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">DealHaus Commission</p>
                <p className="text-xl font-bold text-green-400">
                  ${record.commission_amount ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">Seller Payout</p>
                <p className="text-xl font-bold">
                  ${record.seller_payout ?? 0}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateRevenueStatus(record.id, "earned")}
                className="bg-green-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Earned
              </button>

              <button
                onClick={() => updateRevenueStatus(record.id, "paid_out")}
                className="bg-blue-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Seller Paid
              </button>

              <button
                onClick={() => updateRevenueStatus(record.id, "disputed")}
                className="bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Disputed
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}