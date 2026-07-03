import { supabase } from "@/lib/supabase";

export async function runRevenueWorkflow() {
  let revenueCreated = 0;
  let revenueExisting = 0;
  let revenueErrors = 0;

  const { data: soldPublishTasks, error: soldError } = await supabase
    .from("marketplace_publish_tasks")
    .select("id, inventory_item_id, item_title, listing_price, publish_status")
    .eq("publish_status", "sold")
    .limit(100);

  if (soldError) {
    revenueErrors += 1;
    console.log("Workflow revenue sweep error:", soldError.message);

    return {
      revenueCreated,
      revenueExisting,
      revenueErrors,
    };
  }

  if (soldPublishTasks && soldPublishTasks.length > 0) {
    for (const task of soldPublishTasks) {
      const { data: existingRevenueRecords } = await supabase
  .from("revenue_records")
  .select("id")
  .eq("inventory_item_id", task.inventory_item_id)
  .limit(1);

if (existingRevenueRecords && existingRevenueRecords.length > 0) {
  revenueExisting += 1;
  continue;
}

      const salePrice = task.listing_price || 0;

      const { error: revenueError } = await supabase
        .from("revenue_records")
        .insert({
          inventory_item_id: task.inventory_item_id,
          item_title: task.item_title,
          sale_price: salePrice,
          commission_rate: 10,
          commission_amount: salePrice * 0.1,
          seller_payout: salePrice * 0.9,
          revenue_status: "earned",
        });

      if (revenueError) {
        revenueErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_revenue_creation_failed",
          related_table: "marketplace_publish_tasks",
          related_record_id: task.id,
          item_title: task.item_title,
          exception_status: "open",
          notes: revenueError.message,
        });

        continue;
      }

      const { error: inventoryError } = await supabase
        .from("inventory")
        .update({
          status: "closed",
        })
        .eq("id", task.inventory_item_id);

      if (inventoryError) {
        revenueErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_inventory_close_failed_after_revenue",
          related_table: "inventory",
          related_record_id: task.inventory_item_id,
          item_title: task.item_title,
          exception_status: "open",
          notes: inventoryError.message,
        });
      }

      revenueCreated += 1;
    }
  }

  return {
    revenueCreated,
    revenueExisting,
    revenueErrors,
  };
}