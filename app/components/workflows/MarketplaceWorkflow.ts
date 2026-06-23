import { supabase } from "@/lib/supabase";

export async function runMarketplaceWorkflow() {
  let marketplacePublishCreated = 0;
  let marketplacePublishExisting = 0;
  let marketplacePublishErrors = 0;

  const { data: activeInventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("id, title, price, status")
    .eq("status", "active")
    .limit(100);

  if (inventoryError) {
    marketplacePublishErrors += 1;
    console.log("Workflow inventory publish sweep error:", inventoryError.message);

    return {
      marketplacePublishCreated,
      marketplacePublishExisting,
      marketplacePublishErrors,
    };
  }

  if (activeInventory && activeInventory.length > 0) {
    for (const item of activeInventory) {
      const { data: existingPublishTask } = await supabase
        .from("marketplace_publish_tasks")
        .select("id")
        .eq("inventory_item_id", item.id)
        .limit(1)
        .single();

      if (existingPublishTask) {
        marketplacePublishExisting += 1;
        continue;
      }

      const { error: publishError } = await supabase
        .from("marketplace_publish_tasks")
        .insert({
          inventory_item_id: item.id,
          item_title: item.title || "Marketplace Listing",
          listing_price: item.price || 0,
          facebook_url: "",
          offerup_url: "",
          craigslist_url: "",
          publish_status: "ready_to_publish",
        });

      if (publishError) {
        marketplacePublishErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_marketplace_publish_failed",
          related_table: "inventory",
          related_record_id: item.id,
          item_title: item.title || "Marketplace Listing",
          exception_status: "open",
          notes: publishError.message,
        });
      } else {
        marketplacePublishCreated += 1;
      }
    }
  }

  return {
    marketplacePublishCreated,
    marketplacePublishExisting,
    marketplacePublishErrors,
  };
}