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

  useEffect(() => {
    loadRecords();
  }, []);

  function formatStatus(status: string | null) {
    if (!status) return "Pending";

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function statusClass(status: string | null) {
    if (status === "disputed") {
      return "text-red-400";
    }

    if (status === "paid_out" || status === "collected") {
      return "text-green-400";
    }

    if (status === "earned") {
      return "text-cyan-400";
    }

    return "text-yellow-400";
  }

  return (
    <section className="rounded-2xl border border-green-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Revenue History
          </h2>

          <p className="text-sm text-zinc-400">
            Financial records for DealHaus commissions, seller payouts,
            and completed sales.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRecords}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      {message && (
        <p className="text-sm text-cyan-400">
          {message}
        </p>
      )}

      {loading && (
        <p className="text-zinc-400">
          Loading revenue records...
        </p>
      )}

      {!loading && records.length === 0 && (
        <p className="text-zinc-400">
          No revenue records yet.
        </p>
      )}

      <div className="space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="space-y-4 rounded-xl border border-zinc-800 bg-black p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-lg font-bold">
                  {record.item_title || "Untitled Item"}
                </p>

                <p className="text-sm text-zinc-400">
                  Inventory ID: {record.inventory_item_id || "N/A"}
                </p>

                {record.created_at && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Recorded:{" "}
                    {new Date(record.created_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="md:text-right">
                <p
                  className={`font-bold ${statusClass(
                    record.revenue_status
                  )}`}
                >
                  {formatStatus(record.revenue_status)}
                </p>

                <p className="mt-1 text-sm text-green-400">
                  DealHaus Revenue: $
                  {Number(
                    record.commission_amount || 0
                  ).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  Sale Price
                </p>

                <p className="text-xl font-bold">
                  $
                  {Number(
                    record.sale_price || 0
                  ).toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  Commission Rate
                </p>

                <p className="text-xl font-bold">
                  {record.commission_rate ?? 10}%
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  DealHaus Commission
                </p>

                <p className="text-xl font-bold text-green-400">
                  $
                  {Number(
                    record.commission_amount || 0
                  ).toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  Seller Payout
                </p>

                <p className="text-xl font-bold">
                  $
                  {Number(
                    record.seller_payout || 0
                  ).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}