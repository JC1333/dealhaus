const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const TRANSACTION_ID = process.argv[2];

if (!TRANSACTION_ID) {
  console.error(
    "WEBSITE BUYER COMPLETION EMAIL FAILED: Transaction ID is required."
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
    "\nDEALHAUS WEBSITE BUYER COMPLETION EMAIL"
  );
  console.log("--------------------------------------");

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
    transaction.meetup_status !== "meetup_scheduled"
  ) {
    console.log(
      `SKIPPED: Transaction is ${transaction.meetup_status}/${transaction.transaction_status}.`
    );
    return;
  }

  if (!transaction.meetup_scheduled_at) {
    throw new Error(
      "Scheduled meetup has no meetup_scheduled_at value."
    );
  }

  const scheduledMeetup = new Date(
    transaction.meetup_scheduled_at
  );

  if (Number.isNaN(scheduledMeetup.getTime())) {
    throw new Error(
      "meetup_scheduled_at is not a valid datetime."
    );
  }

  if (scheduledMeetup.getTime() > Date.now()) {
    console.log(
      `SKIPPED: Meetup is scheduled for ${scheduledMeetup.toLocaleString(
        "en-US"
      )}.`
    );

    console.log(
      "Buyer completion confirmation will not be requested early."
    );

    return;
  }

  if (
    !transaction.inventory_item_id ||
    !transaction.negotiation_task_id ||
    !transaction.buyer_outreach_task_id ||
    !transaction.seller_lead_id
  ) {
    throw new Error(
      "Transaction is missing required closing links."
    );
  }

  const {
    data: negotiation,
    error: negotiationError,
  } = await supabase
    .from("negotiation_tasks")
    .select("*")
    .eq(
      "id",
      transaction.negotiation_task_id
    )
    .single();

  if (negotiationError || !negotiation) {
    throw new Error(
      negotiationError?.message ||
        "Accepted negotiation was not found."
    );
  }

  if (
    negotiation.negotiation_status !==
    "offer_accepted"
  ) {
    throw new Error(
      "Negotiation is not offer_accepted."
    );
  }

  const acceptedPrice = Number(
    negotiation.current_offer
  );

  if (
    !Number.isFinite(acceptedPrice) ||
    acceptedPrice <= 0
  ) {
    throw new Error(
      "Accepted negotiation does not contain a valid positive offer."
    );
  }

  if (
    Number(transaction.sale_price) !==
    acceptedPrice
  ) {
    throw new Error(
      "Accepted price does not match transaction."
    );
  }

  const {
    data: buyerTask,
    error: buyerTaskError,
  } = await supabase
    .from("buyer_outreach_tasks")
    .select(
      "id,inventory_item_id,buyer_name,buyer_platform"
    )
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
      "This completion sender is only for DealHaus website buyers."
    );
  }

  if (
    Number(buyerTask.inventory_item_id) !==
    Number(transaction.inventory_item_id)
  ) {
    throw new Error(
      "Buyer outreach task does not belong to this inventory item."
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

  const buyerName =
    conversation.buyer_name ||
    transaction.buyer_name ||
    "there";

  const itemTitle =
    transaction.item_title ||
    "your DealHaus purchase";

  const message =
    `Hi ${buyerName},\n\n` +
    `Just checking in about ${itemTitle}.\n\n` +
    `Did the transaction complete successfully?\n\n` +
    `Please reply with one of the following:\n\n` +
    `COMPLETED\n` +
    `NOT COMPLETED\n\n` +
    `If something still needs to be worked out, you can include the details in your reply.\n\n` +
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
      `Did your purchase complete? ${itemTitle} [DH-BUYER-COMPLETION:${transaction.id}]`,
    text: message,
  });

  if (sendError || !sendResult?.id) {
    throw new Error(
      sendError?.message ||
        "Buyer completion email was not accepted by Resend."
    );
  }

  const previousNotes = String(
    transaction.notes || ""
  ).trim();

  const completionRequestNote =
    `Buyer completion confirmation requested by email.\n` +
    `Buyer email: ${buyerEmail}\n` +
    `Resend ID: ${sendResult.id}`;

  const nextNotes = previousNotes
    ? `${previousNotes}\n\n${completionRequestNote}`
    : completionRequestNote;

  const {
    data: updatedTransaction,
    error: updateError,
  } = await supabase
    .from("brokerage_transactions")
    .update({
      meetup_status:
        "buyer_completion_confirmation_requested",
      notes: nextNotes,
    })
    .eq("id", transaction.id)
    .eq("meetup_status", "meetup_scheduled")
    .select(
      "id,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,notes"
    )
    .single();

  if (updateError || !updatedTransaction) {
    throw new Error(
      updateError?.message ||
        "Buyer completion request update was not verified."
    );
  }

  const {
    error: conversationUpdateError,
  } = await supabase
    .from("buyer_conversations")
    .update({
      last_message: message,
      conversation_stage:
        "buyer_completion_confirmation_requested",
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
    "\nWEBSITE BUYER COMPLETION CONFIRMATION REQUESTED"
  );

  console.dir(updatedTransaction, {
    depth: null,
  });
})().catch((error) => {
  console.error(
    "\nWEBSITE BUYER COMPLETION EMAIL FAILED:",
    error.message
  );

  process.exit(1);
});