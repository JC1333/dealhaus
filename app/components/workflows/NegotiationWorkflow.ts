import { supabase } from "@/lib/supabase";

export async function runNegotiationWorkflow() {
  let negotiationCreated = 0;
  let negotiationExisting = 0;
  let negotiationErrors = 0;

  const { data: buyerOutreachReady, error: buyerOutreachReadyError } =
    await supabase
      .from("buyer_outreach_tasks")
      .select("id, inventory_item_id, item_title, listing_price, buyer_name")
      .eq("outreach_status", "buyer_contacted")
      .limit(100);

  if (buyerOutreachReadyError) {
    negotiationErrors += 1;
    console.log(
      "Workflow buyer outreach sweep error:",
      buyerOutreachReadyError.message
    );
  }

  if (buyerOutreachReady && buyerOutreachReady.length > 0) {
    for (const task of buyerOutreachReady) {
      const { data: existingNegotiation } = await supabase
        .from("negotiation_tasks")
        .select("id")
        .eq("inventory_item_id", task.inventory_item_id)
        .limit(1)
        .single();

      if (existingNegotiation) {
        negotiationExisting += 1;
        continue;
      }

      const { error: negotiationError } = await supabase
        .from("negotiation_tasks")
        .insert({
          inventory_item_id: task.inventory_item_id,
          item_title: task.item_title,
          buyer_name: task.buyer_name || "Workflow Buyer",
          listing_price: task.listing_price || 0,
          current_offer: task.listing_price || 0,
          negotiation_status: "pending",
        });

      if (negotiationError) {
        negotiationErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_negotiation_failed",
          related_table: "buyer_outreach_tasks",
          related_record_id: task.id,
          item_title: task.item_title,
          exception_status: "open",
          notes: negotiationError.message,
        });
      } else {
        negotiationCreated += 1;
      }
    }
  }

  return {
    negotiationCreated,
    negotiationExisting,
    negotiationErrors,
  };
}