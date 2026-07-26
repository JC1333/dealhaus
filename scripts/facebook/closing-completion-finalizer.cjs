const { createClient } = require("@supabase/supabase-js");

const TRANSACTION_ID = process.argv[2];

if (!TRANSACTION_ID) {
  console.error("COMPLETION FINALIZER FAILED: Transaction ID is required.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log("\nDEALHAUS COMPLETION FINALIZER");
  console.log("-----------------------------");

  const { data: tx, error: txError } = await supabase
    .from("brokerage_transactions")
    .select("*")
    .eq("id", TRANSACTION_ID)
    .single();

  if (txError) throw txError;

  console.log("Transaction:", tx.id);
  console.log("Meetup status:", tx.meetup_status);
  console.log("Buyer confirmed:", tx.buyer_confirmed);
  console.log("Seller confirmed:", tx.seller_confirmed);

  if (
    tx.transaction_status !== "open"
  ) {
    console.log("\nTRANSACTION NOT OPEN");
    console.log("No completion changes made.");
    return;
  }

  if (
    tx.buyer_confirmed !== true ||
    tx.seller_confirmed !== true
  ) {
    console.log("\nBOTH SIDES HAVE NOT CONFIRMED");
    console.log("No completion changes made.");
    return;
  }

  if (
    tx.meetup_status === "completed"
  ) {
    console.log("\nMEETUP ALREADY COMPLETED");
    console.log("No duplicate completion performed.");
    return;
  }

  const previousNotes =
    String(tx.notes || "").trim();

  const completionNote =
    "Buyer and seller both confirmed the real-world transaction completed.";

  const nextNotes =
    previousNotes
      ? `${previousNotes}\n\n${completionNote}`
      : completionNote;

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("brokerage_transactions")
    .update({
      meetup_status: "completed",
      completed_at: new Date().toISOString(),
      transaction_status: "pending",
      notes: nextNotes,
    })
    .eq("id", tx.id)
    .eq("buyer_confirmed", true)
    .eq("seller_confirmed", true)
    .select(
      "id,meetup_status,completed_at,buyer_confirmed,seller_confirmed,transaction_status,invoice_status,payment_status"
    )
    .single();

  if (updateError) throw updateError;

  console.log("\nREAL-WORLD SALE COMPLETION VERIFIED");
  console.dir(updated, { depth: null });

  console.log("\nInvoice not sent by this script.");
  console.log("Payment not recorded by this script.");
  console.log("Ready for existing #7 invoice workflow.");
})().catch((error) => {
  console.error(
    "\nCOMPLETION FINALIZER FAILED:",
    error.message
  );
  process.exit(1);
});
