const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const TRANSACTION_ID = process.argv[2];

if (!TRANSACTION_ID) {
  console.error(
    "WEBSITE BUYER LOGISTICS RELAY FAILED: Transaction ID is required."
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(
  process.env.RESEND_API_KEY
);

(async () => {
  console.log(
    "\nDEALHAUS WEBSITE SELLER-TO-BUYER RELAY"
  );
  console.log("-------------------------------------");

  const {
    data: transaction,
    error: transactionError,
  } = await supabase
    .from("brokerage_transactions")
    .select("*")
    .eq("id", TRANSACTION_ID)
    .single();

  if (transactionError || !transaction) {
    throw new Error(
      transactionError?.message ||
        "Brokerage transaction was not found."
    );
  }

  console.log("Transaction:", transaction.id);
  console.log(
    "Current meetup_status:",
    transaction.meetup_status
  );

  if (
    transaction.transaction_status !== "open" ||
    transaction.meetup_status !==
      "seller_preference_received"
  ) {
    console.log(
      `SKIPPED: Transaction is ${transaction.meetup_status}/${transaction.transaction_status}.`
    );
    return;
  }

  if (!transaction.buyer_outreach_task_id) {
    throw new Error(
      "Transaction is missing buyer_outreach_task_id."
    );
  }

  const {
    data: buyerTask,
    error: buyerTaskError,
  } = await supabase
    .from("buyer_outreach_tasks")
    .select("buyer_name,buyer_platform")
    .eq(
      "id",
      transaction.buyer_outreach_task_id
    )
    .single();

  if (buyerTaskError || !buyerTask) {
    throw new Error(
      buyerTaskError?.message ||
        "Buyer outreach task was not found."
    );
  }

  if (
    buyerTask.buyer_platform !==
    "DealHaus Website"
  ) {
    throw new Error(
      "This relay sender is only for DealHaus website buyers."
    );
  }

  const {
    data: conversations,
    error: conversationError,
  } = await supabase
    .from("buyer_conversations")
    .select("id,buyer_name,buyer_email")
    .eq(
      "inventory_id",
      transaction.inventory_item_id
    )
    .eq(
      "buyer_name",
      buyerTask.buyer_name
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1);

  if (conversationError) {
    throw conversationError;
  }

  const conversation =
    conversations?.[0] || null;

  const buyerEmail = String(
    conversation?.buyer_email || ""
  )
    .trim()
    .toLowerCase();

  if (!conversation || !buyerEmail) {
    throw new Error(
      "DealHaus website buyer email was not found."
    );
  }

  const sellerReplyMatch = String(
    transaction.notes || ""
  ).match(
    /Seller closing reply:\s*"([\s\S]*?)"\s*Seller reply classification:/i
  );

  if (!sellerReplyMatch) {
    throw new Error(
      "Verified seller closing reply was not found in transaction notes."
    );
  }

  const sellerConfirmedDetails =
    sellerReplyMatch[1]
      .replace(
        /\r?\nSent from my iPhone\s*$/i,
        ""
      )
      .trim();

  if (!sellerConfirmedDetails) {
    throw new Error(
      "Seller closing reply did not contain usable logistics."
    );
  }

  const buyerName =
    conversation.buyer_name ||
    transaction.buyer_name ||
    "there";

  const itemTitle =
    transaction.item_title ||
    "your DealHaus purchase";

  const message =
    `Hi ${buyerName},\n\n` +
    `The seller confirmed the pickup details for ${itemTitle}:\n\n` +
    `${sellerConfirmedDetails}\n\n` +
    `Please reply CONFIRM if these details work for you, or reply with any changes you need.\n\n` +
    `Thank you,\n` +
    `DealHaus\n` +
    `dealhaus.us`;

  const {
    data: sendResult,
    error: sendError,
  } = await resend.emails.send({
    from: "DealHaus <support@dealhaus.us>",
    to: buyerEmail,
    subject:
      `Pickup details: ${itemTitle} [DH-LOGISTICS:${transaction.id}]`,
    text: message,
  });

  if (sendError || !sendResult?.id) {
    throw new Error(
      sendError?.message ||
        "Buyer logistics email was not accepted by Resend."
    );
  }

  const previousNotes = String(
    transaction.notes || ""
  ).trim();

  const relayNote =
    `Seller-confirmed logistics relayed to ${buyerName}: ` +
    `"${sellerConfirmedDetails}"\n` +
    `Buyer logistics email Resend ID: ${sendResult.id}`;

  const nextNotes = previousNotes
    ? `${previousNotes}\n\n${relayNote}`
    : relayNote;

  const {
    data: updatedTransaction,
    error: updateError,
  } = await supabase
    .from("brokerage_transactions")
    .update({
      meetup_status:
        "buyer_logistics_confirmation_started",
      notes: nextNotes,
    })
    .eq("id", transaction.id)
    .select(
      "id,buyer_name,sale_price,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,notes"
    )
    .single();

  if (updateError || !updatedTransaction) {
    throw new Error(
      updateError?.message ||
        "Transaction logistics relay update was not verified."
    );
  }

  const {
    error: conversationUpdateError,
  } = await supabase
    .from("buyer_conversations")
    .update({
      last_message: message,
      conversation_stage:
        "buyer_logistics_confirmation_started",
    })
    .eq("id", conversation.id);

  if (conversationUpdateError) {
    throw conversationUpdateError;
  }

  const {
    error: messageInsertError,
  } = await supabase
    .from("buyer_conversation_messages")
    .insert({
      buyer_conversation_id:
        conversation.id,
      sender: "DealHaus",
      message,
    });

  if (messageInsertError) {
    throw messageInsertError;
  }

  console.log("RESEND ACCEPTED EMAIL");
  console.log("Resend ID:", sendResult.id);

  console.log(
    "\nWEBSITE BUYER LOGISTICS RELAY COMPLETE"
  );

  console.dir(updatedTransaction, {
    depth: null,
  });
})().catch((error) => {
  console.error(
    "\nWEBSITE BUYER LOGISTICS RELAY FAILED:",
    error.message
  );

  process.exit(1);
});