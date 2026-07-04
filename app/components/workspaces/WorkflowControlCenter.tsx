"use client";

import { useState } from "react";
import { runFullWorkflow } from "../workflows/FullWorkflowRunner";

export default function WorkflowControlCenter() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [lastRun, setLastRun] = useState("");

  async function runOnce() {
    setRunning(true);
    setMessage("Running workflow once...");

    try {
      const workflowResult: any = await runFullWorkflow();

      setMessage(
        `Run complete. Errors: ${workflowResult.totalErrors}. Revenue created: ${workflowResult.revenueWorkflow.revenueCreated}. Marketplace tasks created: ${workflowResult.marketplaceWorkflow.marketplacePublishCreated}.`
      );

      setLastRun(new Date().toLocaleTimeString());
    } catch (error: any) {
      setMessage(error?.message || "Manual workflow run failed.");
      setLastRun(new Date().toLocaleTimeString());
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-purple-900 bg-zinc-950 p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">
          AI Operations Control Center
        </h2>

        <p className="text-sm text-zinc-400">
          Run the DealHaus workflow manually during development without background polling.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={runOnce}
          disabled={running}
          className="bg-purple-400 text-black rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          {running ? "Running..." : "Run Workflow Once"}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-black p-4">
        <p className="text-sm text-zinc-500">Last Run</p>

        <p className="text-white font-bold mt-1">
          {lastRun || "Not run yet"}
        </p>
      </div>

      {message && (
        <p className="text-sm text-cyan-400">
          {message}
        </p>
      )}
    </section>
  );
}