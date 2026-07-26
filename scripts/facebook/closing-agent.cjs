const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runClosingAgent() {
  console.log("\nDEALHAUS CLOSING AGENT");
  console.log("----------------------");
  console.log("Accepted-deal synchronization mode.");

  // Find accepted negotiations that are ready to become
  // real brokerage transactions.
  const { data: acceptedNegotiations, error: negotiationError } =
    await supabase
      .from("negotiation_tasks")
      .select(
        "id,buyer_outreach_task_id,inventory_item_id,item_title,buyer_name,listing_price,current_offer,negotiation_status,created_at"
      )
      .eq("negotiation_status", "offer_accepted")
      .order("created_at", { ascending: true });

  if (negotiationError) {
    throw negotiationError;
  }

  if (!acceptedNegotiations?.length) {
    console.log("No accepted negotiations waiting for closing.");
    return;
  }

  console.log(
    `Accepted negotiations found: ${acceptedNegotiations.length}`
  );

  for (const negotiation of acceptedNegotiations) {
    console.log("\n======================================");
    console.log("PROCESSING ACCEPTED DEAL");
    console.log("Item:", negotiation.item_title);
    console.log("Buyer:", negotiation.buyer_name);
    console.log("Accepted price:", negotiation.current_offer);
    console.log("======================================");

    if (!negotiation.inventory_item_id) {
      console.log(
        "SKIPPED: Negotiation has no inventory item ID."
      );
      continue;
    }

    if (!negotiation.buyer_outreach_task_id) {
      console.log(
        "SKIPPED: Negotiation has no buyer outreach task ID."
      );
      continue;
    }

    const acceptedPrice = Number(
      negotiation.current_offer
    );

    if (
      !Number.isFinite(acceptedPrice) ||
      acceptedPrice <= 0
    ) {
      console.log(
        "SKIPPED: Accepted negotiation does not contain a valid positive offer."
      );
      continue;
    }

    // Verify the linked buyer outreach task.
    const {
      data: buyerOutreachTask,
      error: buyerTaskError,
    } = await supabase
      .from("buyer_outreach_tasks")
      .select("*")
      .eq(
        "id",
        negotiation.buyer_outreach_task_id
      )
      .single();

    if (buyerTaskError) {
      throw buyerTaskError;
    }

    if (
      Number(buyerOutreachTask.inventory_item_id) !==
      Number(negotiation.inventory_item_id)
    ) {
      throw new Error(
        `Buyer outreach task inventory mismatch for negotiation ${negotiation.id}`
      );
    }

    // Load the inventory record.
    const {
      data: inventoryItem,
      error: inventoryError,
    } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", negotiation.inventory_item_id)
      .single();

    if (inventoryError) {
      throw inventoryError;
    }

    // Find the existing brokerage transaction for this item.
    // DealHaus already creates this transaction earlier in the
    // workflow, so closing should synchronize it rather than
    // create a duplicate.
    const {
      data: transactions,
      error: transactionLookupError,
    } = await supabase
      .from("brokerage_transactions")
      .select("*")
      .eq(
        "inventory_item_id",
        negotiation.inventory_item_id
      )
      .order("created_at", { ascending: false });

    if (transactionLookupError) {
      throw transactionLookupError;
    }

    if (!transactions?.length) {
      console.log(
        "SKIPPED: No existing brokerage transaction was found."
      );
      console.log(
        "Closing Agent will not create a transaction blindly."
      );
      continue;
    }

    const transaction =
      transactions.find(
        (row) =>
          row.transaction_status !== "closed"
      ) || transactions[0];

    const commissionRate = Number(
      transaction.commission_rate ??
        inventoryItem.commission_rate ??
        10
    );

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0
    ) {
      throw new Error(
        `Invalid commission rate for transaction ${transaction.id}`
      );
    }

    const commissionAmount =
      Math.round(
        acceptedPrice *
          (commissionRate / 100) *
          100
      ) / 100;

    const sellerPayout =
      Math.round(
        (acceptedPrice - commissionAmount) *
          100
      ) / 100;

    const buyerName =
      String(
        negotiation.buyer_name ||
          buyerOutreachTask.buyer_name ||
          ""
      ).trim();

    if (!buyerName) {
      console.log(
        "SKIPPED: Buyer identity could not be verified."
      );
      continue;
    }

    console.log("\nVERIFIED CLOSING DATA");
    console.log("Buyer:", buyerName);
    console.log(
      "Sale price:",
      `$${acceptedPrice.toFixed(2)}`
    );
    console.log(
      "Commission rate:",
      `${commissionRate}%`
    );
    console.log(
      "Commission:",
      `$${commissionAmount.toFixed(2)}`
    );
    console.log(
      "Seller payout:",
      `$${sellerPayout.toFixed(2)}`
    );

    const {
      data: updatedTransaction,
      error: transactionUpdateError,
    } = await supabase
      .from("brokerage_transactions")
      .update({
        negotiation_task_id:
          negotiation.id,
        buyer_outreach_task_id:
          negotiation.buyer_outreach_task_id,
        buyer_name:
          buyerName,
        sale_price:
          acceptedPrice,
        commission_rate:
          commissionRate,
        commission_amount:
          commissionAmount,
        seller_payout:
          sellerPayout,
        meetup_status:
          transaction.meetup_status || "pending",
        transaction_status:
          transaction.transaction_status || "open",
      })
      .eq("id", transaction.id)
      .select()
      .single();

    if (transactionUpdateError) {
      throw transactionUpdateError;
    }

    console.log(
      "\nBROKERAGE TRANSACTION SYNCHRONIZED"
    );

    console.dir(
      {
        id: updatedTransaction.id,
        inventory_item_id:
          updatedTransaction.inventory_item_id,
        negotiation_task_id:
          updatedTransaction.negotiation_task_id,
        buyer_outreach_task_id:
          updatedTransaction.buyer_outreach_task_id,
        buyer_name:
          updatedTransaction.buyer_name,
        seller_name:
          updatedTransaction.seller_name,
        sale_price:
          updatedTransaction.sale_price,
        commission_rate:
          updatedTransaction.commission_rate,
        commission_amount:
          updatedTransaction.commission_amount,
        seller_payout:
          updatedTransaction.seller_payout,
        meetup_status:
          updatedTransaction.meetup_status,
        buyer_confirmed:
          updatedTransaction.buyer_confirmed,
        seller_confirmed:
          updatedTransaction.seller_confirmed,
        invoice_status:
          updatedTransaction.invoice_status,
        payment_status:
          updatedTransaction.payment_status,
        transaction_status:
          updatedTransaction.transaction_status,
      },
      { depth: null }
    );
  }

    console.log("\n======================================");
  console.log("CLOSING AGENT SYNCHRONIZATION COMPLETE");
  console.log("No Facebook messages were sent.");
  console.log("======================================");
}

runClosingAgent().catch((error) => {
  console.error(
    "\nCLOSING AGENT FAILED:",
    error.message
  );

  process.exit(1);
});