const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const TRANSACTION_ID = process.argv[2];

if (!TRANSACTION_ID) {
  console.error("SELLER CLOSING EMAIL FAILED: Transaction ID is required.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function extractBuyerClosingData(notes) {
  const text = String(notes || "");

  const replyMatch =
    text.match(
      /Buyer closing reply:\s*"([^"]+)"/i
    ) ||
    text.match(
      /Buyer exact reply:\s*"([^"]+)"/i
    );

  const classificationMatch =
    text.match(
      /Buyer preference classification:\s*([^\r\n]+)/i
    ) ||
    text.match(
      /Buyer closing preference:\s*([^\r\n]+)/i
    );

  const rawClassification = classificationMatch
    ? classificationMatch[1].trim().toLowerCase()
    : "";

  const classification =
    rawClassification === "delivery"
      ? "assembly_or_delivery"
      : rawClassification;

  return {
    reply: replyMatch ? replyMatch[1].trim() : "",
    classification,
  };
}

(async () => {
  console.log("\nDEALHAUS SELLER CLOSING EMAIL");
  console.log("--------------------------------");

  // Load exact transaction.
  const { data: tx, error: txError } = await supabase
    .from("brokerage_transactions")
    .select("*")
    .eq("id", TRANSACTION_ID)
    .single();

  if (txError) throw txError;

  console.log("Transaction:", tx.id);
  console.log("Current meetup_status:", tx.meetup_status);

  // Critical state gate.
  if (
    tx.transaction_status !== "open" ||
    tx.meetup_status !== "buyer_completion_confirmation_requested"
  ) {
    console.log("\nSELLER COMPLETION CHECK NOT READY");
    console.log("No email sent.");
    console.log("No DealHaus data changed.");
    return;
  }

  if (!tx.meetup_scheduled_at) {
    throw new Error(
      "Scheduled meetup has no meetup_scheduled_at value."
    );
  }

  const scheduledMeetup = new Date(tx.meetup_scheduled_at);

  if (Number.isNaN(scheduledMeetup.getTime())) {
    throw new Error(
      "meetup_scheduled_at is not a valid datetime."
    );
  }

  if (scheduledMeetup.getTime() > Date.now()) {
    console.log(
      `SKIPPED: Meetup is scheduled for ${scheduledMeetup.toLocaleString("en-US")}.`
    );
    console.log(
      "Seller completion confirmation will not be requested early."
    );
    return;
  }

  if (!tx.seller_lead_id) {
    throw new Error("Transaction has no seller_lead_id.");
  }

  if (!tx.inventory_item_id) {
    throw new Error("Transaction has no inventory_id.");
  }

  // Load exact seller.
  const { data: seller, error: sellerError } = await supabase
    .from("seller_leads")
    .select("*")
    .eq("id", tx.seller_lead_id)
    .single();

  if (sellerError) throw sellerError;

  if (seller.approval_status !== "approved") {
    throw new Error("Seller is not approved.");
  }

  if (seller.agreement_accepted !== true) {
    throw new Error("Seller agreement has not been accepted.");
  }

  const preferredContact = String(
    seller.preferred_contact_method || ""
  ).toLowerCase();

  if (preferredContact !== "email") {
    console.log(
      `Seller preferred contact method is "${preferredContact || "unknown"}", not email.`
    );
    console.log("No email sent.");
    console.log("No DealHaus data changed.");
    return;
  }

  const sellerEmail = String(
    seller.seller_email ||
    seller.email ||
    ""
  ).trim();

  if (!sellerEmail) {
    throw new Error("Approved seller has no email address.");
  }

  // Load exact inventory.
  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", tx.inventory_item_id)
    .single();

  if (inventoryError) throw inventoryError;

  const itemTitle = String(
    inventory.title ||
    seller.item_title ||
    "your item"
  ).trim();

  const buyerName = String(
    tx.buyer_name || "the buyer"
  ).trim();

  const salePrice = Number(tx.sale_price);

  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error("Transaction does not contain a valid sale price.");
  }

  console.log("Seller:", sellerEmail);
  console.log("Item:", itemTitle);
  console.log("Buyer:", buyerName);
  console.log(
    "Accepted price:",
    `$${salePrice.toFixed(2)}`
  );

    const subject =
    `DealHaus Sale Completion [${tx.id}]: ${itemTitle}`;

    const body = [
    `Hi ${seller.seller_name || seller.name || "there"},`,
    "",
    `Just checking in on the ${itemTitle}.`,
    "",
    `Did the sale with ${buyerName} go through successfully for $${salePrice.toFixed(2)}?`,
    "",
    "Please reply and let us know whether the transaction was completed, or if anything still needs to be worked out.",
    "",
    "Once both sides confirm the sale is complete, DealHaus will move the transaction into the final commission and payment step.",
    "",
    "Thanks,",
    "DealHaus",
    "Your Marketplace Selling Partner",
    "Helping local sellers connect with serious buyers.",
    "dealhaus.us"
  ].join("\n");
  console.log("\nSending seller coordination email...");

  const { data: sendResult, error: sendError } =
    await resend.emails.send({
      from: "DealHaus <invoices@dealhaus.us>",
      to: sellerEmail,
      replyTo: "dealhaus@duekseleu.resend.app",
      subject,
      text: body,
      html: body
        .split("\n")
        .map((line) => {
          if (line === "DealHaus") {
            return "<strong>DealHaus</strong>";
          }
          if (line === "Your Marketplace Selling Partner") {
            return "<em>Your Marketplace Selling Partner</em>";
          }
          if (line === "dealhaus.us") {
            return '<a href="https://dealhaus.us">dealhaus.us</a>';
          }
          return line
            ? line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            : "";
        })
        .join("<br>"),
    });

  if (sendError) {
    throw sendError;
  }

  if (!sendResult || !sendResult.id) {
    throw new Error(
      "Resend did not return a verified email ID."
    );
  }

  console.log("RESEND ACCEPTED EMAIL");
  console.log("Resend ID:", sendResult.id);

  // Advance state only after external provider acceptance.
  const previousNotes = String(tx.notes || "").trim();

  const coordinationNote =
    `Seller closing coordination email sent.\n` +
    `Resend ID: ${sendResult.id}\n` +
    `Seller email: ${sellerEmail}`;

  const nextNotes = previousNotes
    ? `${previousNotes}\n\n${coordinationNote}`
    : coordinationNote;

  const {
    data: updatedTransaction,
    error: updateError,
  } = await supabase
    .from("brokerage_transactions")
    .update({
      meetup_status: "completion_confirmations_requested",
      notes: nextNotes,
    })
    .eq("id", tx.id)
    .eq("transaction_status", "open")
    .eq("meetup_status", "buyer_completion_confirmation_requested")
    .select(
      "id,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,invoice_status,payment_status"
    )
    .single();

  if (updateError) throw updateError;

  console.log("\nSELLER COORDINATION STARTED");
  console.dir(updatedTransaction, { depth: null });

  console.log("\nNo sale confirmation performed.");
  console.log("No commission invoice sent.");
})().catch((error) => {
  console.error(
    "\nSELLER CLOSING EMAIL FAILED:",
    error.message
  );
  process.exit(1);
});







