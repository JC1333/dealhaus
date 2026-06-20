"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type WorkflowStats = {
  sellerLeads: number;
  listingPrepTasks: number;
  aiRelistTasks: number;
  inventoryItems: number;
  buyerMatches: number;
  buyerOutreachTasks: number;
  negotiationTasks: number;
  marketplacePublishTasks: number;
  revenueRecords: number;
  exceptionTasks: number;
};

export default function WorkflowMonitor() {
  const [stats, setStats] = useState<WorkflowStats>({
    sellerLeads: 0,
    listingPrepTasks: 0,
    aiRelistTasks: 0,
    inventoryItems: 0,
    buyerMatches: 0,
    buyerOutreachTasks: 0,
    negotiationTasks: 0,
    marketplacePublishTasks: 0,
    revenueRecords: 0,
    exceptionTasks: 0,
  });

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  async function getCount(tableName: string) {
    const { count, error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`Workflow monitor count error for ${tableName}:`, error.message);
      return 0;
    }

    return count || 0;
  }

  async function loadStats() {
    setLoading(true);

    const [
      sellerLeads,
      listingPrepTasks,
      aiRelistTasks,
      inventoryItems,
      buyerMatches,
      buyerOutreachTasks,
      negotiationTasks,
      marketplacePublishTasks,
      revenueRecords,
      exceptionTasks,
    ] = await Promise.all([
      getCount("seller_leads"),
      getCount("listing_prep_tasks"),
      getCount("ai_relist_tasks"),
      getCount("inventory"),
      getCount("buyer_matches"),
      getCount("buyer_outreach_tasks"),
      getCount("negotiation_tasks"),
      getCount("marketplace_publish_tasks"),
      getCount("revenue_records"),
      getCount("exception_tasks"),
    ]);

    setStats({
      sellerLeads,
      listingPrepTasks,
      aiRelistTasks,
      inventoryItems,
      buyerMatches,
      buyerOutreachTasks,
      negotiationTasks,
      marketplacePublishTasks,
      revenueRecords,
      exceptionTasks,
    });

    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }

  useEffect(() => {
    loadStats();

    const interval = setInterval(() => {
      loadStats();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="rounded-2xl border border-cyan-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Workflow Monitor</h2>
          <p className="text-sm text-zinc-400">
            Live automation counts across the DealHaus pipeline.
          </p>
        </div>

        <button
          onClick={loadStats}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      <div className="text-sm text-zinc-400">
        {loading ? "Updating workflow stats..." : `Last updated: ${lastUpdated || "Not yet"}`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Seller Leads" value={stats.sellerLeads} />
        <StatCard label="Listing Prep" value={stats.listingPrepTasks} />
        <StatCard label="AI Relist" value={stats.aiRelistTasks} />
        <StatCard label="Inventory" value={stats.inventoryItems} />
        <StatCard label="Buyer Matches" value={stats.buyerMatches} />
        <StatCard label="Buyer Outreach" value={stats.buyerOutreachTasks} />
        <StatCard label="Negotiations" value={stats.negotiationTasks} />
        <StatCard label="Marketplace Publish" value={stats.marketplacePublishTasks} />
        <StatCard label="Revenue Records" value={stats.revenueRecords} />
        <StatCard label="Exceptions" value={stats.exceptionTasks} warning={stats.exceptionTasks > 0} />
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warning ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-black"
      }`}
    >
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={warning ? "text-3xl font-bold text-red-400" : "text-3xl font-bold text-white"}>
        {value}
      </p>
    </div>
  );
}