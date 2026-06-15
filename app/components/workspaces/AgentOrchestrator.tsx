"use client";

import { useState } from "react";

export default function AgentOrchestrator() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const runAgents = async () => {
    setRunning(true);

    const newLogs: string[] = [];

    newLogs.push("Acquisition Agent Check");
    newLogs.push("Seller Outreach Agent Check");
    newLogs.push("Seller Approval Agent Check");
    newLogs.push("AI Relist Agent Check");
    newLogs.push("Buyer Match Agent Check");
    newLogs.push("Buyer Outreach Agent Check");
    newLogs.push("Negotiation Agent Check");
    newLogs.push("Marketplace Agent Check");
    newLogs.push("Revenue Agent Check");
    newLogs.push("Exception Agent Check");

    setLogs(newLogs);

    setRunning(false);
  };

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