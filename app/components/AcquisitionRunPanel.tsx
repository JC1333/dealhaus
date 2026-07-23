"use client";

import { useState } from "react";

export default function AcquisitionRunPanel() {
  const [city, setCity] = useState("Las Vegas");
  const [state, setState] = useState("NV");
  const [radius, setRadius] = useState("25");
  const [category, setCategory] = useState("furniture");
  const [runType, setRunType] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function startRun() {
    setLoading(true);
    setError("");
    setLeads([]);

    try {
      const res = await fetch("/api/acquisition-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, state, radius, category, runType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Run failed");
      }

      setLeads(data.leads || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">AI Acquisition Run</h2>
        <p className="text-sm text-zinc-400">
          Generate scored seller leads and save them directly into seller_leads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="bg-black border border-zinc-800 rounded-xl p-3" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        <input className="bg-black border border-zinc-800 rounded-xl p-3" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
        <input className="bg-black border border-zinc-800 rounded-xl p-3" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="Radius" />
        <input className="bg-black border border-zinc-800 rounded-xl p-3" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
        <select className="bg-black border border-zinc-800 rounded-xl p-3" value={runType} onChange={(e) => setRunType(e.target.value)}>
          <option value="daily">Daily Run</option>
          <option value="manual">Manual Run</option>
          <option value="high_profit">High Profit Run</option>
        </select>
      </div>

      <button
        onClick={startRun}
        disabled={loading}
        className="bg-white text-black rounded-xl px-5 py-3 font-semibold disabled:opacity-50"
      >
        {loading ? "Running AI Acquisition..." : "Start Acquisition Run"}
      </button>

      {error && <p className="text-red-400">{error}</p>}

      {leads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Generated Leads</h3>
          {leads.map((lead, index) => (
            <div key={index} className="rounded-xl border border-zinc-800 bg-black p-4">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-bold">{lead.item_title}</p>
                  <p className="text-sm text-zinc-400">
  {lead.seller_name || "Seller not identified"} · {lead.seller_city}, {lead.seller_state} · {lead.platform}
</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Score: {lead.acquisition_score}</p>
                 <p className="text-sm text-green-400">
  Price Upside: ${Number(lead.estimated_profit || 0).toLocaleString()}
</p>
<p className="text-sm text-cyan-400">
  Est. DealHaus Commission: ${Number(lead.estimated_commission || 0).toLocaleString()}
</p> 
                </div>
              </div>
              <p className="text-sm text-zinc-300 mt-3">{lead.acquisition_reason}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}