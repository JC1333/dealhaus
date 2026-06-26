"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ListingPrepTask = {
  id: string;
  seller_lead_id: string | null;
  item_title: string | null;
  seller_name: string | null;
  seller_city: string | null;
  seller_state: string | null;
  asking_price: number | null;
  estimated_profit: number | null;
  acquisition_score: number | null;
  prep_status: string | null;
  created_at: string | null;
};

export default function ListingPrepQueue() {
  const [tasks, setTasks] = useState<ListingPrepTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTasks() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("listing_prep_tasks")
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

  async function markReadyForRelist(task: ListingPrepTask) {
    const { error } = await supabase
      .from("listing_prep_tasks")
      .update({ prep_status: "ready_for_relist" })
      .eq("id", task.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    const { error: relistError } = await supabase
      .from("ai_relist_tasks")
      .insert({
        listing_prep_task_id: task.id,
        seller_lead_id: task.seller_lead_id,
        item_title: task.item_title,
        seller_name: task.seller_name,
        asking_price: task.asking_price,
        estimated_profit: task.estimated_profit,
        relist_status: "pending",
      });

    if (relistError) {
      setMessage(relistError.message);
      return;
    }

    await loadTasks();
  }

async function generateAiRelist(task: ListingPrepTask) {
  setMessage("Finding AI relist task...");

  const { data, error: findError } = await supabase
    .from("ai_relist_tasks")
    .select("*")
    .eq("listing_prep_task_id", task.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (findError || !data) {
    setMessage("No AI relist task found. Click Mark Ready for AI Relist first.");
    return;
  }
  
  if (data.inventory_item_id) {
  setMessage("This AI relist has already been added to inventory.");
  return;
}

  setMessage("Generating AI relist...");

  const res = await fetch("/api/generate-ai-relist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      taskId: data.id,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    setMessage(result.error || "AI relist generation failed.");
    return;
  }

  setMessage("Creating inventory item...");

  const generatedTask = result.task;
  const { data: photoTask } = await supabase
  .from("ai_relist_tasks")
  .select(`
    id,
    listing_prep_tasks (
      seller_leads (
        photo_urls
      )
    )
  `)
  .eq("id", generatedTask.id)
  .single();

const rawSellerLead = (photoTask as any)?.listing_prep_tasks?.seller_leads;
const photoSellerLead = Array.isArray(rawSellerLead) ? rawSellerLead[0] : rawSellerLead;

const fallbackImage =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop";

const inventoryImages =
  Array.isArray(photoSellerLead?.photo_urls) && photoSellerLead.photo_urls.length > 0
    ? photoSellerLead.photo_urls
    : [fallbackImage];
  console.log("Generated AI relist task:", generatedTask);

  const { data: inventoryItem, error: inventoryError } = await supabase
    .from("inventory")
   .insert({
  title: generatedTask.ai_title,
  description: generatedTask.ai_description,
  price: generatedTask.ai_price_recommendation,
  status: "active",
  seller_name: generatedTask.seller_name,
  asking_price: generatedTask.asking_price,
  profit_score: generatedTask.estimated_profit,
  image: inventoryImages[0],
  images: inventoryImages,
})
    .select()
    .single();

  if (inventoryError) {
    setMessage("Inventory insert error: " + inventoryError.message);
    return;
  }

  const { error: updateError } = await supabase
    .from("ai_relist_tasks")
    .update({
      inventory_item_id: inventoryItem.id,
      relist_status: "listed",
    })
    .eq("id", generatedTask.id);

  if (updateError) {
    setMessage("Relist task update error: " + updateError.message);
    return;
  }
  const { data: existingPublishTask } = await supabase
  .from("marketplace_publish_tasks")
  .select("id")
  .eq("inventory_item_id", inventoryItem.id)
  .limit(1)
  .single();

if (!existingPublishTask) {
  await supabase
    .from("marketplace_publish_tasks")
    .insert({
      inventory_item_id: inventoryItem.id,
      item_title: inventoryItem.title,
      listing_price: inventoryItem.price,
      publish_status: "ready_to_publish",
    });
}

  setMessage("AI relist generated and added to inventory.");
  await loadTasks();
}

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <section className="rounded-2xl border border-purple-900 bg-zinc-950 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Listing Prep Queue</h2>
          <p className="text-sm text-zinc-400">
            Approved sellers ready to become AI-generated listings.
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

      {loading && <p className="text-zinc-400">Loading listing prep tasks...</p>}

      {!loading && tasks.length === 0 && (
        <p className="text-zinc-400">No listing prep tasks yet.</p>
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
                  {task.seller_name || "Unknown Seller"} ·{" "}
                  {task.seller_city || "Unknown City"},{" "}
                  {task.seller_state || ""}
                </p>
              </div>

              <div className="md:text-right">
                <p className="font-bold">
                  Prep Status: {task.prep_status || "pending"}
                </p>
                <p className="text-green-400 text-sm">
                  Est. Profit: ${task.estimated_profit ?? 0}
                </p>
                <p className="text-zinc-400 text-sm">
                  Asking: ${task.asking_price ?? 0}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => markReadyForRelist(task)}
                className="bg-purple-400 text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Mark Ready for AI Relist
              </button>

              <button
                onClick={() => generateAiRelist(task)}
                className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Generate AI Relist
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}