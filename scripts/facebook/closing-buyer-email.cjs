const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const transactionId = process.argv[2];

if (!transactionId) {
  throw new Error(
    "Usage: node closing-buyer-email.cjs <transaction_id>"
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(
  process.env.RESEND_API_KEY
);

(async () => {
  console.log("\nDEALHAUS WEBSITE BUYER CLOSING EMAIL");
  console.log("-----------------------------------");

  const {
    data: transaction,
    error: transactionError,
  } = await supabase
    .from("brokerage_transactions")
    .select(
      "id,inventory_item_id,item_title,buyer_name,sale_price,meetup_status,transaction_status,buyer_outreach_task_id"
    )
    .eq("id", transactionId)
    .single();

  if (transactionError || !transaction) {
    throw new Error(
      transactionError?.message ||
        "Closing transaction was not found."
    );
  }

  if (
    transaction.meetup_status !== "pending" ||
    transaction.transaction_status !== "open"
  ) {
    console.log(
      `SKIPPED: Transaction is already ${transaction.meetup_status}/${transaction.transaction_status}.`
    );
    return;
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
      "This sender is only for DealHaus website buyers."
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
      "The DealHaus website buyer email was not found."
    );
  }

  const buyerName =
    conversation.buyer_name ||
    transaction.buyer_name ||
    "there";

  const salePrice = Number(
    transaction.sale_price || 0
  );

  const subject =
    `Purchase confirmed: ${transaction.item_title}`;

  const message =
    `Hi ${buyerName},\n\n` +
    `Your purchase of ${transaction.item_title} has been confirmed at $${salePrice.toFixed(
      2
    )}.\n\n` +
    `Would you prefer pickup or delivery?\n\n` +
    `Please reply with one of the following:\n\n` +
    `PICKUP\n` +
    `DELIVERY\n\n` +
    `Once you reply, DealHaus will coordinate the details with the seller.\n\n` +
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
      `${subject} [DH-CLOSING:${transaction.id}]`,
    text: message,
  });

  if (sendError || !sendResult?.id) {
    throw new Error(
      sendError?.message ||
        "Buyer closing email was not accepted by Resend."
    );
  }

  const {
    error: transactionUpdateError,
  } = await supabase
    .from("brokerage_transactions")
    .update({
      meetup_status:
        "buyer_coordination_started",
    })
    .eq("id", transaction.id)
    .eq("meetup_status", "pending");

  if (transactionUpdateError) {
    throw transactionUpdateError;
  }

  const {
    error: conversationUpdateError,
  } = await supabase
    .from("buyer_conversations")
    .update({
      last_message: message,
      conversation_stage:
        "buyer_closing_started",
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
    "WEBSITE BUYER CLOSING COORDINATION STARTED"
  );

  console.log({
    transaction_id: transaction.id,
    buyer_email: buyerEmail,
    meetup_status:
      "buyer_coordination_started",
  });
})().catch((error) => {
  console.error(
    "\nWEBSITE BUYER CLOSING EMAIL FAILED:",
    error.message
  );

  process.exit(1);
});