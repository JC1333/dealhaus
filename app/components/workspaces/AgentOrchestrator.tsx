"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { runFullWorkflow } from "../workflows/FullWorkflowRunner";

type AgentHealth = {
  agent: string;
  table: string;
  status: "Healthy" | "Ready" | "Error";
  count: number;
};

export default function AgentOrchestrator() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [health, setHealth] = useState<AgentHealth[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<string>("Never");

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

  async function refreshHealth(extraLogs: string[] = []) {
    const newLogs: string[] = [...extraLogs];
    const newActions: string[] = [];
    const newHealth: AgentHealth[] = [];

    for (const check of checks) {
      const { count, error } = await supabase
        .from(check.table)
        .select("*", { count: "exact", head: true });

      if (error) {
        newLogs.push(`${check.agent}: error checking ${check.table}: ${error.message}`);
        newHealth.push({
          agent: check.agent,
          table: check.table,
          status: "Error",
          count: 0,
        });
        continue;
      }

      const safeCount = count || 0;
      newLogs.push(`${check.agent}: ${safeCount} records checked`);

      if (safeCount > 0) {
        newActions.push(
          `${check.agent} is monitoring ${safeCount} record${safeCount === 1 ? "" : "s"}`
        );
      }

      newHealth.push({
        agent: check.agent,
        table: check.table,
        status: safeCount > 0 ? "Healthy" : "Ready",
        count: safeCount,
      });
    }

    const { count: openExceptions } = await supabase
      .from("exception_tasks")
      .select("*", { count: "exact", head: true })
      .eq("exception_status", "open");

    newActions.push(
      `Exception Agent: ${openExceptions || 0} open exceptions need review`
    );

    const { count: unpaidRevenue } = await supabase
      .from("revenue_records")
      .select("*", { count: "exact", head: true })
      .eq("revenue_status", "earned");

    newActions.push(
      `Revenue Agent: ${unpaidRevenue || 0} earned revenue records need payout review`
    );

    setHealth(newHealth);
    setLogs(newLogs);
    setActions(newActions);
    setLastRun(new Date().toLocaleTimeString());
  }

  const runAgents = async () => {
    if (running) return;

    setRunning(true);

    try {
      const result = await runFullWorkflow();
      await refreshHealth([
        `Full workflow completed with ${result.totalErrors} total error${result.totalErrors === 1 ? "" : "s"}.`,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown workflow error";
      await refreshHealth([`Full workflow failed: ${message}`]);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    void refreshHealth();

    const interval = window.setInterval(() => {
      void refreshHealth();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold">DealHaus Agent Orchestrator</h3>
          <p className="text-zinc-400 text-sm mt-1">
            Runs the full DealHaus workflow and monitors workflow health.
          </p>
          <p className="text-zinc-500 text-xs mt-2">Last run: {lastRun}</p>
        </div>

        <button
          onClick={runAgents}
          disabled={running}
          className="bg-white text-black px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
        >
          {running ? "Running All Agents..." : "Run All Agents"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        {health.map((item) => (
          <div key={item.agent} className="bg-black border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-sm">{item.agent}</p>
            <p className="text-white font-bold mt-2">{item.count}</p>
            <p
              className={
                item.status === "Healthy"
                  ? "text-green-400 text-sm mt-1"
                  : item.status === "Error"
                  ? "text-red-400 text-sm mt-1"
                  : "text-cyan-400 text-sm mt-1"
              }
            >
              {item.status}
            </p>
          </div>
        ))}
      </div>

      {actions.length > 0 && (
        <div className="mb-6 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
          <p className="text-cyan-400 font-bold mb-2">Agent Action Summary</p>
          <div className="space-y-2">
            {actions.map((action, index) => (
              <p key={index} className="text-sm text-white">{action}</p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log, index) => (
          <div key={index} className="bg-black border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}