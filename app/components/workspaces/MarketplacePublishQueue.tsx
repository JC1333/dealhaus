"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PublishTask = {
  id: string;
  inventory_item_id: number | null;
  item_title: string | null;
  listing_price: number | null;
  facebook_url: string | null;
  offerup_url: string | null;
  craigslist_url: string | null;
  publish_status: string | null;
  created_at: string | null;
};

export default function MarketplacePublishQueue() {
  const [tasks, setTasks] = useState<PublishTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTasks() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("marketplace_publish_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setTasks(data || []);
    setLoading(false);
  }

  async function copyListingText(task: PublishTask) {
    const text = `${task.item_title || "DealHaus Listing"}

Price: $${task.listing_price ?? 0}

Available through DealHaus. Message for details, pickup timing, and availability.`;

    await navigator.clipboard.writeText(text);
    setMessage("Listing text copied.");
  }

  async function updateTask(task: PublishTask, updates: Partial<PublishTask>) {
    const { error } = await supabase
      .from("marketplace_publish_tasks")
      .update(updates)
      .eq("id", task.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadTasks();
  }
async function saveUrls(task: PublishTask) {
  const facebookInput = document.getElementById(
    `facebook-${task.id}`
  ) as HTMLInputElement | null;

  const offerupInput = document.getElementById(
    `offerup-${task.id}`
  ) as HTMLInputElement | null;

  const craigslistInput = document.getElementById(
    `craigslist-${task.id}`
  ) as HTMLInputElement | null;

  await updateTask(task, {
    facebook_url: facebookInput?.value || "",
    offerup_url: offerupInput?.value || "",
    craigslist_url: craigslistInput?.value || "",
  });

  setMessage("Marketplace URLs saved.");
}
  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <section className="rounded-2xl border border-blue-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Marketplace Publish Queue</h2>
          <p className="text-sm text-zinc-400">
            Copy listing details, publish manually, save marketplace URLs, and track status.
          </p>
        </div>

        <button
          onClick={loadTasks}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm hover:border-cyan-500"
        >
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-cyan-400">{message}</p>}

      {loading && <p className="text-zinc-400">Loading marketplace publish tasks...</p>}

      {!loading && tasks.length === 0 && (
        <p className="text-zinc-400">No marketplace publish tasks yet.</p>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-zinc-800 bg-black p-4 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="font-bold text-lg">
                  {task.item_title || "Untitled Item"}
                </p>
                <p className="text-sm text-zinc-400">
                  Inventory ID: {task.inventory_item_id || "N/A"}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">
                  Status: {task.publish_status || "ready_to_publish"}
                </p>
                <p className="text-green-400 text-sm">
                  Price: ${task.listing_price ?? 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  <input
    id={`facebook-${task.id}`}
    defaultValue={task.facebook_url || ""}
    placeholder="Facebook Marketplace URL"
    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
  />

  <input
    id={`offerup-${task.id}`}
    defaultValue={task.offerup_url || ""}
    placeholder="OfferUp URL"
    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
  />

  <input
    id={`craigslist-${task.id}`}
    defaultValue={task.craigslist_url || ""}
    placeholder="Craigslist URL"
    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
  />
</div>

            <div className="flex flex-wrap gap-2">
            <button
  onClick={() => saveUrls(task)}
  className="bg-cyan-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
>
  Save URLs
</button>
              <button
                onClick={() => copyListingText(task)}
                className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Copy Listing Text
              </button>

              <button
                onClick={() =>
                  updateTask(task, { publish_status: "published" })
                }
                className="bg-blue-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Published
              </button>

              <button
 onClick={async () => {
  await updateTask(task, { publish_status: "sold" });

  const { data: existingRevenue } = await supabase
    .from("revenue_records")
    .select("id")
    .eq("inventory_item_id", task.inventory_item_id)
    .limit(1)
    .single();

  if (existingRevenue) {
    setMessage("Revenue record already exists for this item.");
    return;
  }

  const { error: revenueError } = await supabase
    .from("revenue_records")
    .insert({
      inventory_item_id: task.inventory_item_id,
      item_title: task.item_title,
      sale_price: task.listing_price,
      commission_rate: 10,
      commission_amount: (task.listing_price || 0) * 0.1,
      seller_payout: (task.listing_price || 0) * 0.9,
      revenue_status: "earned",
    });

  if (revenueError) {
    setMessage(revenueError.message);
    return;
  }

  setMessage("Item marked sold and revenue recorded.");
}}
  className="bg-green-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
>
  Mark Sold
</button>

              <button
                onClick={() =>
                  updateTask(task, { publish_status: "removed" })
                }
                className="bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Removed
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}