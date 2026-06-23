import { supabase } from "@/lib/supabase";

export async function runBuyerWorkflow() {
  let buyerMatchCreated = 0;
  let buyerMatchExisting = 0;
  let buyerMatchErrors = 0;
  let buyerOutreachCreated = 0;
  let buyerOutreachExisting = 0;
  let buyerOutreachErrors = 0;

  const { data: activeInventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("id,title,price,status")
    .eq("status", "active")
    .limit(100);

  if (inventoryError) {
    buyerMatchErrors += 1;
    console.log("Workflow inventory check error:", inventoryError.message);
  }

  if (activeInventory && activeInventory.length > 0) {
    for (const item of activeInventory) {
      const { data: existingMatch } = await supabase
        .from("buyer_matches")
        .select("id")
        .eq("inventory_id", item.id)
        .limit(1)
        .single();

      if (existingMatch) {
        buyerMatchExisting += 1;
        continue;
      }

      const { error: matchError } = await supabase
        .from("buyer_matches")
        .insert({
          inventory_id: item.id,
          inventory_title: item.title,
          buyer_name: "Workflow Qualified Buyer",
          buyer_email: "workflow-buyer@dealhaus.local",
          buyer_interest_score: 88,
          outreach_status: "new",
        });

      if (matchError) {
        buyerMatchErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_buyer_match_failed",
          related_table: "inventory",
          related_record_id: item.id,
          item_title: item.title,
          exception_status: "open",
          notes: matchError.message,
        });
      } else {
        buyerMatchCreated += 1;
      }
    }
  }

  const { data: buyerMatchesReady, error: buyerMatchReadyError } =
    await supabase
      .from("buyer_matches")
      .select("id, inventory_id, inventory_title, buyer_name, buyer_email")
      .in("outreach_status", ["new", "buyer_contacted"])
      .limit(100);

  if (buyerMatchReadyError) {
    buyerOutreachErrors += 1;
    console.log("Workflow buyer match sweep error:", buyerMatchReadyError.message);
  }

  if (buyerMatchesReady && buyerMatchesReady.length > 0) {
    for (const match of buyerMatchesReady) {
      const { data: existingBuyerTask } = await supabase
        .from("buyer_outreach_tasks")
        .select("id")
        .eq("inventory_item_id", match.inventory_id)
        .limit(1)
        .single();

      if (existingBuyerTask) {
        buyerOutreachExisting += 1;
        continue;
      }

      const { error: buyerTaskError } = await supabase
        .from("buyer_outreach_tasks")
        .insert({
          inventory_item_id: match.inventory_id,
          item_title: match.inventory_title,
          listing_price: 0,
          buyer_name: match.buyer_name || "Workflow Buyer",
          buyer_platform: "Workflow Engine",
          outreach_message: `Hi ${
            match.buyer_name || "there"
          }, DealHaus found a listing you may be interested in: ${
            match.inventory_title
          }. Would you like details?`,
          outreach_status: "buyer_contacted",
        });

      if (buyerTaskError) {
        buyerOutreachErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_buyer_outreach_failed",
          related_table: "buyer_matches",
          related_record_id: match.id,
          item_title: match.inventory_title,
          exception_status: "open",
          notes: buyerTaskError.message,
        });
      } else {
        buyerOutreachCreated += 1;

        await supabase
          .from("buyer_matches")
          .update({
            outreach_status: "buyer_contacted",
          })
          .eq("id", match.id);
      }
    }
  }

  return {
    buyerMatchCreated,
    buyerMatchExisting,
    buyerMatchErrors,
    buyerOutreachCreated,
    buyerOutreachExisting,
    buyerOutreachErrors,
  };
}