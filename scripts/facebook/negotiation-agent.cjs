const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function getSellerForInventory(inventoryItemId) {
  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select(
      "id,title,price,asking_price,seller_name,seller_email,seller_phone,preferred_contact_method"
    )
    .eq("id", inventoryItemId)
    .single();

  if (inventoryError) throw inventoryError;
  if (!inventory) throw new Error("Inventory item not found");

  let sellerLead = null;

  const { data: relistTasks, error: relistError } = await supabase
    .from("ai_relist_tasks")
    .select("seller_lead_id,listing_prep_task_id")
    .eq("inventory_item_id", inventoryItemId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (relistError) throw relistError;

  const relistTask = relistTasks?.[0];

  let sellerLeadId = relistTask?.seller_lead_id || null;

  if (!sellerLeadId && relistTask?.listing_prep_task_id) {
    const { data: prepTask, error: prepError } = await supabase
      .from("listing_prep_tasks")
      .select("seller_lead_id")
      .eq("id", relistTask.listing_prep_task_id)
      .single();

    if (prepError) throw prepError;

    sellerLeadId = prepTask?.seller_lead_id || null;
  }

  if (sellerLeadId) {
    const { data: lead, error: leadError } = await supabase
      .from("seller_leads")
      .select(
        "id,seller_name,seller_email,seller_phone,preferred_contact_method,asking_price,commission_rate,approval_status,agreement_accepted"
      )
      .eq("id", sellerLeadId)
      .single();

    if (leadError) throw leadError;

    sellerLead = lead;
  }

  return {
    inventory,
    sellerLead,
  };
}
async function getNegotiationTask(negotiationTaskId) {
  const { data: task, error } = await supabase
    .from("negotiation_tasks")
    .select("*")
    .eq("id", negotiationTaskId)
    .single();

  if (error) throw error;
  if (!task) throw new Error("Negotiation task not found");

  if (!task.inventory_item_id) {
    throw new Error("Negotiation task is missing inventory_item_id");
  }

  if (!task.current_offer || Number(task.current_offer) <= 0) {
    throw new Error("Negotiation task is missing a valid buyer offer");
  }

  return task;
}

function buildSellerOfferMessage({
  sellerName,
  itemTitle,
  listingPrice,
  buyerOffer,
}) {
  return `Hi ${sellerName || "there"},

DealHaus received a buyer offer on your listing:

Item: ${itemTitle}
Current listing price: $${Number(listingPrice || 0).toFixed(2)}
Buyer offer: $${Number(buyerOffer || 0).toFixed(2)}

Please reply with one of the following:

ACCEPT
REJECT
COUNTER $___

DealHaus will not finalize or communicate acceptance to the buyer until your response is confirmed.

Thank you,
DealHaus`;
}
async function sendOfferToSeller(negotiationTaskId) {
  const task = await getNegotiationTask(negotiationTaskId);
  if (task.negotiation_status !== "buyer_offer_received") {
    console.log(
      `NEGOTIATION SKIPPED: status is "${task.negotiation_status}", not "buyer_offer_received".`
    );
    return;
  }

  const { inventory, sellerLead } =
    await getSellerForInventory(task.inventory_item_id);

  const preferredMethod = String(
    sellerLead?.preferred_contact_method ||
      inventory.preferred_contact_method ||
      "email"
  ).toLowerCase();

  const sellerName =
    sellerLead?.seller_name ||
    inventory.seller_name ||
    "there";

  const sellerEmail =
    sellerLead?.seller_email ||
    inventory.seller_email ||
    "";

  if (preferredMethod !== "email") {
    throw new Error(
      `Seller prefers ${preferredMethod}. Human review required before contacting seller.`
    );
  }

  if (!sellerEmail) {
    throw new Error(
      "Seller prefers email but no seller email address is available"
    );
  }

  if (
    sellerLead &&
    (sellerLead.approval_status !== "approved" ||
      sellerLead.agreement_accepted !== true)
  ) {
    throw new Error(
      "Seller is not verified as approved with an accepted DealHaus agreement"
    );
  }

  const message = buildSellerOfferMessage({
    sellerName,
    itemTitle: task.item_title || inventory.title,
    listingPrice: task.listing_price || inventory.price,
    buyerOffer: task.current_offer,
  });

 const subject =
  `DealHaus Buyer Offer [${task.id}]: ${task.item_title || inventory.title}`;
  if (DRY_RUN) {
    console.log("\nDRY RUN — NO EMAIL WILL BE SENT");
    console.log(`Negotiation ID: ${task.id}`);
    console.log(`Seller: ${sellerName}`);
    console.log(`Email: ${sellerEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Buyer offer: $${Number(task.current_offer).toFixed(2)}`);
    console.log("\nSELLER MESSAGE:");
    console.log(message);
    return;
  }
  const { data, error } = await resend.emails.send({
    from: "DealHaus <invoices@dealhaus.us>",
    to: sellerEmail,
    replyTo: "dealhaus@duekseleu.resend.app",
    subject,
    text: message,
  });

  if (error) {
    throw new Error(
      error.message || "Seller negotiation email failed"
    );
  }

  const { error: updateError } = await supabase
    .from("negotiation_tasks")
    .update({
      negotiation_status: "seller_offer_sent",
    })
    .eq("id", task.id);

  if (updateError) throw updateError;

  console.log("\nSELLER OFFER EMAIL SENT");
  console.log(`Seller: ${sellerName}`);
  console.log(`Email: ${sellerEmail}`);
  console.log(`Buyer offer: $${Number(task.current_offer).toFixed(2)}`);
  console.log("Negotiation status: seller_offer_sent");

  return data;
}
const NEGOTIATION_TASK_ID = process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");

if (!NEGOTIATION_TASK_ID) {
  console.log(
    'Usage: node --env-file=.env.local scripts\\facebook\\negotiation-agent.cjs <negotiation_task_id>'
  );
  process.exit(0);
}

sendOfferToSeller(NEGOTIATION_TASK_ID).catch((error) => {
  console.error(
    "\nNEGOTIATION AGENT FAILED:",
    error.message
  );
  process.exit(1);
});

