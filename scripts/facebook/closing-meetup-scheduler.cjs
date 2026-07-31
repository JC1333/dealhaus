const { createClient } = require("@supabase/supabase-js");

const TRANSACTION_ID = process.argv[2];

if (!TRANSACTION_ID) {
  console.error("MEETUP SCHEDULER FAILED: Transaction ID is required.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function extractQuotedNote(notes, label) {
  const text = String(notes || "");
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const matches = Array.from(
    text.matchAll(
      new RegExp(`${escaped}\\s*"([\\s\\S]*?)"`, "gi")
    )
  );

  const latest = matches[matches.length - 1];

  return latest ? latest[1].trim() : "";
}

function extractTime(text) {
  const value = String(text || "");

  const match = value.match(
    /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3].toLowerCase().replace(/\./g, "");

  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  return { hour, minute };
}

function extractRelativeDay(...texts) {
  for (const raw of texts) {
    const text = String(raw || "").toLowerCase();

    if (/\btomorrow\b/.test(text)) {
      return 1;
    }

    if (/\btoday\b/.test(text)) {
      return 0;
    }
  }

  return null;
}

(async () => {
  console.log("\nDEALHAUS MEETUP SCHEDULER");
  console.log("-------------------------");

  const { data: tx, error: txError } = await supabase
    .from("brokerage_transactions")
    .select("*")
    .eq("id", TRANSACTION_ID)
    .single();

  if (txError) throw txError;

  console.log("Transaction:", tx.id);
  console.log("Buyer:", tx.buyer_name);
  console.log("Current meetup_status:", tx.meetup_status);

  if (
    tx.transaction_status !== "open" ||
    tx.meetup_status !== "buyer_logistics_confirmed"
  ) {
    console.log("\nMEETUP NOT READY TO SCHEDULE");
    console.log("No DealHaus data changed.");
    return;
  }

  if (tx.meetup_scheduled_at) {
    console.log("\nMEETUP ALREADY SCHEDULED");
    console.log("Scheduled at:", tx.meetup_scheduled_at);
    console.log("No duplicate scheduling performed.");
    return;
  }

  const notes = String(tx.notes || "");

  const buyerInitialRequest =
    extractQuotedNote(notes, "Buyer closing reply:");

  const sellerReply =
    extractQuotedNote(notes, "Seller closing reply:");

  const buyerLogisticsReply =
    extractQuotedNote(notes, "Buyer logistics reply:") ||
    extractQuotedNote(notes, "Buyer logistics confirmation:");

  const sellerTime =
    extractTime(sellerReply);

  const buyerConfirmedTime =
    extractTime(buyerLogisticsReply);

  const buyerRequestedTime =
    extractTime(buyerInitialRequest);

  const agreedTime =
    sellerTime ||
    buyerConfirmedTime ||
    buyerRequestedTime;

  const relativeDay =
    extractRelativeDay(
      sellerReply,
      buyerLogisticsReply,
      buyerInitialRequest
    );

  console.log("Buyer original request:", buyerInitialRequest || "(none)");
  console.log("Seller confirmation:", sellerReply || "(none)");
  console.log("Buyer logistics confirmation:", buyerLogisticsReply || "(none)");

  if (!agreedTime || relativeDay === null) {
    console.log("\nMEETUP TIME NEEDS REVIEW");
    console.log(
      "A clear agreed date and clock time could not be determined safely."
    );
    console.log("No meetup_scheduled_at written.");
    console.log("No sale confirmation performed.");
    return;
  }

  const scheduled = new Date();

  scheduled.setSeconds(0, 0);
  scheduled.setDate(
    scheduled.getDate() + relativeDay
  );

  scheduled.setHours(
    agreedTime.hour,
    agreedTime.minute,
    0,
    0
  );

  if (scheduled.getTime() <= Date.now()) {
    throw new Error(
      "Calculated meetup time is not in the future. Human review required."
    );
  }

  const previousNotes =
    notes.trim();

  const scheduleNote =
    `Meetup scheduled for ${scheduled.toLocaleString("en-US")}. ` +
    `Derived from confirmed buyer/seller logistics.`;

  const nextNotes =
    previousNotes
      ? `${previousNotes}\n\n${scheduleNote}`
      : scheduleNote;

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("brokerage_transactions")
    .update({
      meetup_status: "meetup_scheduled",
      meetup_scheduled_at: scheduled.toISOString(),
      notes: nextNotes,
    })
    .eq("id", tx.id)
    .eq("meetup_status", "buyer_logistics_confirmed")
    .select(
      "id,buyer_name,meetup_status,meetup_scheduled_at,buyer_confirmed,seller_confirmed,transaction_status"
    )
    .single();

  if (updateError) throw updateError;

  console.log("\nMEETUP SCHEDULED");
  console.dir(updated, { depth: null });

  console.log("\nBuyer not marked confirmed.");
  console.log("Seller not marked confirmed.");
  console.log("Sale not marked completed.");
  console.log("No invoice sent.");
})().catch((error) => {
  console.error(
    "\nMEETUP SCHEDULER FAILED:",
    error.message
  );
  process.exit(1);
});

