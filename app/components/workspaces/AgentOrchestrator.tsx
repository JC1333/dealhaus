"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AgentOrchestrator() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [health, setHealth] = useState<
  { agent: string; status: string; count: number }[]
>([]);

  const runAgents = async () => {
    setRunning(true);
    const newLogs: string[] = [];
    const newHealth: {
  agent: string;
  status: string;
  count: number;
}[] = [];

    const checks = [
      { agent: "Seller Acquisition Agent", table: "seller_leads" },
      { agent: "Seller Outreach Agent", table: "outreach_tasks" },
      { agent: "Seller Approval Agent", table: "listing_prep_tasks" },
      { agent: "AI Relist Agent", table: "ai_relist_tasks" },
      { agent: "Buyer Match Agent", table: "buyer_matches" },
      { agent: "Buyer Outreach Agent", table: "buyer_outreach_tasks" },
      { agent: "Negotiation Agent", table: "negotiation_tasks" },
      { agent: "Marketplace Agent", table: "marketplace_publish_tasks" },
      { agent: "Revenue Agent", table: "revenue_records" },
      { agent: "Exception Agent", table: "exception_tasks" },
    ];

    for (const check of checks) {
      const { count, error } = await supabase
        .from(check.table)
        .select("*", { count: "exact", head: true });

      if (error) {
        newLogs.push(`${check.agent}: error checking ${check.table}`);
      } else {
        newLogs.push(`${check.agent}: ${count || 0} records checked`);
newHealth.push({
  agent: check.agent,
  status: (count || 0) > 0 ? "Healthy" : "Idle",
  count: count || 0,
});
    }
    }
        const { count: openExceptions } = await supabase
      .from("exception_tasks")
      .select("*", { count: "exact", head: true })
      .eq("exception_status", "open");

    newLogs.push(
      `Exception Agent Action: ${openExceptions || 0} open exceptions need review`
    );

    const { count: unpaidRevenue } = await supabase
      .from("revenue_records")
      .select("*", { count: "exact", head: true })
      .eq("revenue_status", "earned");

    newLogs.push(
      `Revenue Agent Action: ${unpaidRevenue || 0} earned revenue records need payout review`
    );

    setHealth(newHealth);
    setLogs(newLogs);
    setRunning(false);
  };
  useEffect(() => {
    runAgents();

    const interval = setInterval(() => {
      runAgents();
    }, 300000);

    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">
          DealHaus Agent Orchestrator
        </h3>

        <button
          onClick={runAgents}
          disabled={running}
          className="bg-white text-black px-4 py-2 rounded-xl font-semibold"
        >
          {running ? "Running..." : "Run All Agents"}
        </button>
      </div>
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">

  {health.map((item) => (

    <div
      key={item.agent}
      className="bg-black border border-zinc-800 rounded-xl p-4"
    >

      <p className="text-zinc-400 text-sm">
        {item.agent}
      </p>

      <p className="text-white font-bold mt-2">
        {item.count}
      </p>

      <p
        className={
          item.status === "Healthy"
            ? "text-green-400 text-sm mt-1"
            : "text-yellow-400 text-sm mt-1"
        }
      >
        {item.status}
      </p>

    </div>

  ))}

</div>
      <div className="space-y-2">
        {logs.map((log, index) => (
          <div
            key={index}
            className="bg-black border border-zinc-800 rounded-xl p-3"
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}