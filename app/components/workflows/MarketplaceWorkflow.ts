import { supabase } from "@/lib/supabase";

export async function runMarketplaceWorkflow() {
  let marketplacePublishCreated = 0;
  let marketplacePublishExisting = 0;
  let marketplacePublishErrors = 0;

  const { data: negotiationTasks, error: negotiationError } = await supabase
    .from("negotiation_tasks")
    .select("id, inventory_item_id, item_title, listing_price, negotiation_status")
    .in("negotiation_status", ["pending", "accepted", "ready_to_publish"])
    .limit(10);

  if (negotiationError) {
    marketplacePublishErrors += 1;
    console.log("Workflow negotiation sweep error:", negotiationError.message);

    return {
      marketplacePublishCreated,
      marketplacePublishExisting,
      marketplacePublishErrors,
    };
  }

  if (negotiationTasks && negotiationTasks.length > 0) {
    for (const task of negotiationTasks) {
      const { data: existingPublishTask } = await supabase
        .from("marketplace_publish_tasks")
        .select("id")
        .eq("inventory_item_id", task.inventory_item_id)
        .limit(1)
        .single();

      if (existingPublishTask) {
        marketplacePublishExisting += 1;
        continue;
      }

      const { error: publishError } = await supabase
        .from("marketplace_publish_tasks")
        .insert({
          inventory_item_id: task.inventory_item_id,
          item_title: task.item_title,
          listing_price: task.listing_price || 0,
          facebook_url: "",
          offerup_url: "",
          craigslist_url: "",
          publish_status: "ready_to_publish",
        });

      if (publishError) {
        marketplacePublishErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_marketplace_publish_failed",
          related_table: "negotiation_tasks",
          related_record_id: task.id,
          item_title: task.item_title,
          exception_status: "open",
          notes: publishError.message,
        });
      } else {
  marketplacePublishCreated += 1;

  await supabase
    .from("negotiation_tasks")
    .update({
      negotiation_status: "sent_to_marketplace_publish",
    })
    .eq("id", task.id);
}
    }
  }

  return {
    marketplacePublishCreated,
    marketplacePublishExisting,
    marketplacePublishErrors,
  };
}