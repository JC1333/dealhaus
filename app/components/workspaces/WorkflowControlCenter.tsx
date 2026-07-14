"use client";

import { useState } from "react";
import { runFullWorkflow } from "../workflows/FullWorkflowRunner";

export default function WorkflowControlCenter() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [lastRun, setLastRun] = useState("");

  async function runOnce() {
    if (running) return;

    setRunning(true);
    setMessage("Running workflow once...");

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
  window.setTimeout(() => {
    reject(
      new Error(
        "Workflow stopped after 120 seconds because one of the workflow stages did not finish."
      )
    );
  }, 120000);
});

      const workflowResult: any = await Promise.race([
        runFullWorkflow(),
        timeoutPromise,
      ]);

      setMessage(
        [
          `Run complete.`,
          `Errors: ${workflowResult.totalErrors}.`,
          `Revenue created: ${
            workflowResult.revenueWorkflow?.revenueCreated || 0
          }.`,
          `Marketplace tasks created: ${
            workflowResult.marketplaceWorkflow?.marketplacePublishCreated || 0
          }.`,
          `Invoices sent: ${
            workflowResult.invoiceWorkflow?.invoicesSent || 0
          }.`,
          `Invoices already handled: ${
            workflowResult.invoiceWorkflow?.invoicesExisting || 0
          }.`,
        ].join(" ")
      );

      setLastRun(new Date().toLocaleTimeString());
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Manual workflow run failed.";

      setMessage(errorMessage);
      setLastRun(new Date().toLocaleTimeString());
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-purple-900 bg-zinc-950 p-6">
      <div>
        <h2 className="text-2xl font-bold">
          AI Operations Control Center
        </h2>

        <p className="text-sm text-zinc-400">
          Run the DealHaus workflow manually during development without
          background polling.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runOnce}
          disabled={running}
          className="rounded-xl bg-purple-400 px-5 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Running..." : "Run Workflow Once"}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-black p-4">
        <p className="text-sm text-zinc-500">
          Last Run
        </p>

        <p className="mt-1 font-bold text-white">
          {lastRun || "Not run yet"}
        </p>

        {message && (
          <p className="mt-2 text-sm text-cyan-400">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}