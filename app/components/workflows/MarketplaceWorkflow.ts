import { supabase } from "@/lib/supabase";

export async function runMarketplaceWorkflow() {
  let marketplacePublishCreated = 0;
  let marketplacePublishExisting = 0;
  let marketplacePublishErrors = 0;

  const { data: activeInventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("id, title, price, status, seller_name, seller_email")
    .eq("status", "active")
    .limit(100);

  if (inventoryError) {
    marketplacePublishErrors += 1;

    await supabase.from("exception_tasks").insert({
      exception_type: "workflow_marketplace_publish_failed",
      related_table: "inventory",
      related_record_id: null,
      item_title: "Marketplace Publish Sweep",
      exception_status: "open",
      notes: inventoryError.message,
    });

    return {
      marketplacePublishCreated,
      marketplacePublishExisting,
      marketplacePublishErrors,
    };
  }

  if (activeInventory && activeInventory.length > 0) {
    for (const item of activeInventory) {
      let publishTaskId: string | null = null;

      const { data: existingPublishTasks, error: existingPublishError } =
        await supabase
          .from("marketplace_publish_tasks")
          .select("id")
          .eq("inventory_item_id", item.id)
          .limit(1);

      if (existingPublishError) {
        marketplacePublishErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_marketplace_publish_lookup_failed",
          related_table: "inventory",
          related_record_id: item.id,
          item_title: item.title || "Marketplace Listing",
          exception_status: "open",
          notes: existingPublishError.message,
        });

        continue;
      }

      if (existingPublishTasks && existingPublishTasks.length > 0) {
        marketplacePublishExisting += 1;
        publishTaskId = existingPublishTasks[0].id;
      } else {
        const { data: publishTask, error: publishError } = await supabase
          .from("marketplace_publish_tasks")
          .insert({
            inventory_item_id: item.id,
            item_title: item.title || "Marketplace Listing",
            listing_price: item.price || 0,
            facebook_url: "",
            offerup_url: "",
            craigslist_url: "",
            publish_status: "ready_to_publish",
          })
          .select("id")
          .single();

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

          continue;
        }

        marketplacePublishCreated += 1;
        publishTaskId = publishTask?.id || null;
      }

      const {
        data: existingBrokerageTransactions,
        error: existingBrokerageError,
      } = await supabase
        .from("brokerage_transactions")
        .select("id")
        .eq("inventory_item_id", item.id)
        .limit(1);

      if (existingBrokerageError) {
        marketplacePublishErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_brokerage_lookup_failed",
          related_table: "inventory",
          related_record_id: item.id,
          item_title: item.title || "Marketplace Listing",
          exception_status: "open",
          notes: existingBrokerageError.message,
        });

        continue;
      }

      if (
        !existingBrokerageTransactions ||
        existingBrokerageTransactions.length === 0
      ) {
        const salePrice = Number(item.price || 0);

        const { error: brokerageError } = await supabase
          .from("brokerage_transactions")
          .insert({
            inventory_item_id: item.id,
            marketplace_publish_task_id: publishTaskId,
            item_title: item.title || "Marketplace Listing",
            seller_name: item.seller_name || "Marketplace Seller",
            seller_email: item.seller_email || null,
            sale_price: salePrice,
            commission_rate: 10,
            commission_amount: salePrice * 0.1,
            seller_payout: salePrice * 0.9,
            meetup_status: "pending",
            buyer_confirmed: false,
            seller_confirmed: false,
            invoice_status: "not_sent",
            payment_status: "unpaid",
            transaction_status: "open",
          });

        if (brokerageError) {
          marketplacePublishErrors += 1;

          await supabase.from("exception_tasks").insert({
            exception_type: "workflow_brokerage_transaction_failed",
            related_table: "inventory",
            related_record_id: item.id,
            item_title: item.title || "Marketplace Listing",
            exception_status: "open",
            notes: brokerageError.message,
          });
        }
      }
    }
  }

  return {
    marketplacePublishCreated,
    marketplacePublishExisting,
    marketplacePublishErrors,
  };
}