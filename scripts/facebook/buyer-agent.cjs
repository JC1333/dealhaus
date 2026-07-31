const { chromium } = require("playwright");
const OpenAI = require("openai");
const DRY_RUN = process.argv.includes("--dry-run");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const { spawnSync } = require("child_process");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
async function getConversationMessages(
  conversationContainer
) {
  const messageElements =
    conversationContainer.locator(
      '[aria-label^="Enter, Message sent"]'
    );

  const messages = [];

  for (
    let i = 0;
    i < await messageElements.count();
    i++
  ) {
    const aria =
      (await messageElements
        .nth(i)
        .getAttribute("aria-label")) || "";

    const match = aria.match(
      /^Enter, Message sent .* by ([^:]+):\s*(.+)$/
    );

    if (!match) continue;

    messages.push({
      sender: match[1].trim(),
      message: match[2].trim(),
      aria,
    });
  }

  return messages;
}

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("\nDEALHAUS FACEBOOK BUYER AGENT");
  console.log("----------------------------");
  console.log("INBOUND BUYER DETECTION MODE");
if (DRY_RUN) {
  console.log("DRY RUN MODE — NO FACEBOOK MESSAGES WILL BE SENT");
}

  const { data: publishedTasks, error: publishError } = await supabase
    .from("marketplace_publish_tasks")
    .select(
  "inventory_item_id,item_title,listing_price,facebook_url,publish_status"
)
    .eq("publish_status", "published")
    .neq("facebook_url", "");

  if (publishError) throw publishError;

  if (!publishedTasks?.length) {
    console.log("No published Facebook listings found.");
    return;
  }

  console.log(
    `Published Facebook listings found: ${publishedTasks.length}`
  );

  const profileDir = path.join(
    process.cwd(),
    ".dealhaus-facebook-profile"
  );

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: null,
    args: ["--start-maximized"],
  });

  const page = context.pages()[0] || (await context.newPage());

  console.log("\nOpening Facebook Messenger...");

  try {
    await page.goto("https://www.facebook.com/messages/", {
      waitUntil: "commit",
      timeout: 30000,
    });
  } catch (error) {
    console.log(
      "Messenger navigation warning:",
      error.message
    );
  }

  await page.waitForTimeout(5000);

  console.log("Opening Marketplace inbox...");

  for (let attempt = 1; attempt <= 20; attempt++) {
    const marketplace = page
      .getByText("Marketplace", { exact: true })
      .first();

    if (await marketplace.isVisible().catch(() => false)) {
      await marketplace.click().catch(() => {});
      break;
    }

    console.log(`WAITING FOR MARKETPLACE ${attempt}/20`);
    await page.waitForTimeout(2000);
  }

  await page.waitForTimeout(4000);

  const conversationHeadings = page.locator(
  'a[role="link"][aria-label^="Group chat: "]'
);

let conversationCount = 0;

for (let attempt = 1; attempt <= 30; attempt++) {
  conversationCount = await conversationHeadings.count();

  if (conversationCount > 0) {
    break;
  }

  console.log(
    `WAITING FOR MARKETPLACE CONVERSATIONS ${attempt}/30`
  );

  // Facebook sometimes renders the Marketplace sidebar late.
  // Re-click Marketplace periodically to force the list to refresh.
  if (attempt % 5 === 0) {
    const marketplace = page
      .getByText("Marketplace", { exact: true })
      .first();

    if (await marketplace.isVisible().catch(() => false)) {
      await marketplace.click().catch(() => {});
    }
  }

  await page.waitForTimeout(2000);
}

console.log(
  `Marketplace conversation cards found: ${conversationCount}`
);

  let buyerThreadsFound = 0;

  for (let i = 0; i < conversationCount; i++) {
    const heading = conversationHeadings.nth(i);

    const aria = await heading.getAttribute("aria-label");

    if (!aria) continue;

    const conversationTitle = aria
  .replace(/^Group chat:\s+/i, "")
  .trim();

    const publishedTask = publishedTasks.find((task) => {
      const itemTitle = String(task.item_title || "")
        .toLowerCase()
        .trim();

      return (
        itemTitle &&
        conversationTitle
          .toLowerCase()
          .includes(itemTitle)
      );
    });

    if (!publishedTask) {
      continue;
    }

    console.log("\nPOSSIBLE BUYER THREAD:");
    console.log(conversationTitle);

    await heading.click({
  timeout: 15000,
  force: true,
});

let threadBody = "";
let conversationContainer = null;
let previousMessageSnapshot = "";
let stableMessagePasses = 0;

for (let attempt = 1; attempt <= 15; attempt++) {
  await page.waitForTimeout(1000);

  conversationContainer = page.locator(
  `[aria-label="Messages in conversation titled ${conversationTitle}"]`
);

  const conversationVisible =
    await conversationContainer
      .isVisible()
      .catch(() => false);

  if (!conversationVisible) {
    console.log(
      `WAITING FOR BUYER THREAD TO LOAD ${attempt}/15`
    );
    continue;
  }

  threadBody = await conversationContainer
    .innerText()
    .catch(() => "");

  const messageElements = conversationContainer.locator(
    '[aria-label^="Enter, Message sent"]'
  );

  const messageCount = await messageElements.count();

  const messageSnapshot = [];

  for (let messageIndex = 0; messageIndex < messageCount; messageIndex++) {
    const messageAria =
      (await messageElements
        .nth(messageIndex)
        .getAttribute("aria-label")) || "";

    if (messageAria) {
      messageSnapshot.push(messageAria);
    }
  }

  const currentMessageSnapshot =
    messageSnapshot.join("\n");

  if (
    currentMessageSnapshot &&
    currentMessageSnapshot === previousMessageSnapshot
  ) {
    stableMessagePasses++;
  } else {
    stableMessagePasses = 0;
  }

  previousMessageSnapshot =
    currentMessageSnapshot;

  if (
    messageCount > 0 &&
    stableMessagePasses >= 1
  ) {
    console.log(
      `BUYER THREAD STABLE: ${messageCount} MESSAGE ELEMENTS`
    );
    break;
  }

  console.log(
    `WAITING FOR BUYER MESSAGES TO STABILIZE ${attempt}/15`
  );
}

if (!threadBody) {
  throw new Error(
    `Buyer conversation "${conversationTitle}" did not fully load`
  );
}

    // Seller-side conversations started by DealHaus must be ignored.
    if (threadBody.includes("You started this chat")) {
      console.log(
        "IGNORED: This is a seller-side conversation started by DealHaus."
      );
      continue;
    }

    // A buyer-side Marketplace conversation normally identifies the other
    // participant as Buyer / lets us view buyer profile.
    const looksBuyerSide =
      threadBody.includes("View buyer profile") ||
      threadBody.includes("· Buyer") ||
      threadBody.includes(" Buyer\n");

    if (!looksBuyerSide) {
      console.log(
        "IGNORED: Could not verify this as a buyer-side conversation."
      );
      continue;
    }

    buyerThreadsFound++;

    const buyerName =
      conversationTitle.split("·")[0]?.trim() ||
      "Facebook Buyer";

    const threadMessages =
  await getConversationMessages(
    conversationContainer
  );

const incomingMessages =
  threadMessages.filter(
    (message) =>
      message.sender.toLowerCase() !== "you" &&
      message.sender.toLowerCase() !== "dealhaus"
  );

    if (!incomingMessages.length) {
      console.log(
        "Buyer-side thread found, but no inbound buyer message was parsed."
      );
      continue;
    }

    const newestBuyerMessage =
      incomingMessages[incomingMessages.length - 1];
const newestBuyerThreadIndex =
  threadMessages.findLastIndex(
    (message) =>
      message.aria === newestBuyerMessage.aria
  );

if (newestBuyerThreadIndex === -1) {
  throw new Error(
    "Newest buyer message could not be anchored inside the exact verified thread."
  );
}

const alreadyRespondedAfterNewestBuyerMessage =
  threadMessages
    .slice(newestBuyerThreadIndex + 1)
    .some(
      (message) =>
        message.sender.toLowerCase() === "you" ||
        message.sender.toLowerCase() === "dealhaus"
    );

if (alreadyRespondedAfterNewestBuyerMessage) {
  console.log(
    "SAFETY: DealHaus/You already responded after this buyer message."
  );
}
    console.log("BUYER:", buyerName);
    console.log(
      "NEWEST MESSAGE:",
      newestBuyerMessage.message
    );

    const { data: existingConversations, error: existingError } =
      await supabase
        .from("buyer_conversations")
        .select("*")
        .eq(
          "inventory_id",
          publishedTask.inventory_item_id
        )
        .eq("buyer_name", buyerName)
        .order("created_at", { ascending: false })
        .limit(1);

    if (existingError) throw existingError;

    let conversation =
      existingConversations?.[0] || null;
    if (!conversation) {
      const { data: newConversation, error: createError } =
        await supabase
          .from("buyer_conversations")
          .insert({
            inventory_id:
              publishedTask.inventory_item_id,
            inventory_title:
              publishedTask.item_title,
            buyer_name: buyerName,
            buyer_email: "",
            last_message:
              newestBuyerMessage.message,
            conversation_stage:
              "facebook_buyer_inquiry",
            unread_count: 1,
          })
          .select()
          .single();

      if (createError) throw createError;

      conversation = newConversation;

      console.log(
        "Created DealHaus buyer conversation."
      );
    } else {
      const nextUnread =
        Number(conversation.unread_count || 0) + 1;

      const { error: conversationUpdateError } =
        await supabase
          .from("buyer_conversations")
          .update({
            last_message:
              newestBuyerMessage.message,
            conversation_stage:
  ["offer_accepted", "ready_to_close", "sold", "closed"].includes(
    String(conversation.conversation_stage || "").toLowerCase()
  )
    ? conversation.conversation_stage
    : "facebook_buyer_inquiry",
            unread_count: nextUnread,
          })
          .eq("id", conversation.id);

      if (conversationUpdateError) {
        throw conversationUpdateError;
      }

      console.log(
        "Updated existing DealHaus buyer conversation."
      );
    }
    // Ensure this Facebook buyer has a durable outreach-task link.
    const { data: existingBuyerTasks, error: buyerTaskLookupError } =
      await supabase
        .from("buyer_outreach_tasks")
        .select("*")
        .eq("inventory_item_id", publishedTask.inventory_item_id)
        .eq("buyer_name", buyerName)
        .eq("buyer_platform", "Facebook Marketplace")
        .order("created_at", { ascending: false })
        .limit(1);

    if (buyerTaskLookupError) {
      throw buyerTaskLookupError;
    }

    let buyerOutreachTask =
      existingBuyerTasks?.[0] || null;

    if (!buyerOutreachTask) {
      const { data: newBuyerTask, error: buyerTaskInsertError } =
        await supabase
          .from("buyer_outreach_tasks")
          .insert({
            inventory_item_id:
              publishedTask.inventory_item_id,
            item_title:
              publishedTask.item_title,
            listing_price:
              Number(publishedTask.listing_price || 0),
            buyer_name:
              buyerName,
            buyer_platform:
              "Facebook Marketplace",
            outreach_message:
              newestBuyerMessage.message,
            outreach_status:
              "buyer_responded",
          })
          .select()
          .single();

      if (buyerTaskInsertError) {
        throw buyerTaskInsertError;
      }

      buyerOutreachTask = newBuyerTask;

      console.log(
        "Created Facebook buyer outreach task."
      );
    } else {
      const { data: updatedBuyerTask, error: buyerTaskUpdateError } =
        await supabase
          .from("buyer_outreach_tasks")
          .update({
            outreach_message:
              newestBuyerMessage.message,
            outreach_status:
              "buyer_responded",
          })
          .eq("id", buyerOutreachTask.id)
          .select()
          .single();

      if (buyerTaskUpdateError) {
        throw buyerTaskUpdateError;
      }

      buyerOutreachTask = updatedBuyerTask;

      console.log(
        "Updated Facebook buyer outreach task."
      );
    }
    // Check whether the seller has responded to a negotiation for this buyer.
    const { data: negotiationResults, error: negotiationResultError } =
      await supabase
        .from("negotiation_tasks")
        .select("id,negotiation_status,current_offer")
        .eq("buyer_outreach_task_id", buyerOutreachTask.id)
        .order("created_at", { ascending: false })
        .limit(1);

    if (negotiationResultError) {
      throw negotiationResultError;
    }

    const negotiationResult =
      negotiationResults?.[0] || null;
const conversationAlreadyAccepted =
  String(conversation?.conversation_stage || "").toLowerCase() ===
  "offer_accepted";

const negotiationAlreadyAccepted =
  String(negotiationResult?.negotiation_status || "").toLowerCase() ===
  "offer_accepted";

const shouldSkipAcceptedRelay =
  conversationAlreadyAccepted && negotiationAlreadyAccepted;
if (
  negotiationResult &&
  !shouldSkipAcceptedRelay &&
  [
    "offer_accepted",
    "offer_rejected",
    "seller_counter_received",
  ].includes(negotiationResult.negotiation_status)
) {
  const negotiationAmount =
    Number(negotiationResult.current_offer);

  if (
    !Number.isFinite(negotiationAmount) ||
    negotiationAmount <= 0
  ) {
    throw new Error(
      `Negotiation ${negotiationResult.id} has an invalid current_offer and cannot be relayed to Facebook`
    );
  }
}

    if (
      negotiationResult &&
      [
        "offer_accepted",
        "offer_rejected",
        "seller_counter_received",
      ].includes(negotiationResult.negotiation_status)
    ) {
      let sellerDecisionResponse = "";

      if (
        negotiationResult.negotiation_status ===
        "offer_accepted"
      ) {
        sellerDecisionResponse =
          `Good news — the seller accepted your offer of $${Number(
            negotiationResult.current_offer || 0
          ).toFixed(2)}. I'll help coordinate the next steps.`;
      }

      if (
        negotiationResult.negotiation_status ===
        "offer_rejected"
      ) {
        sellerDecisionResponse =
          "Thanks for your patience. The seller has declined that offer. You're welcome to make another offer if you'd like.";
      }

      if (
        negotiationResult.negotiation_status ===
        "seller_counter_received"
      ) {
        sellerDecisionResponse =
          `The seller came back with a counteroffer of $${Number(
            negotiationResult.current_offer || 0
          ).toFixed(2)}. Let me know if you'd like to accept it or make another offer.`;
      }

      const { data: alreadyRelayed, error: relayLookupError } =
        await supabase
          .from("buyer_conversation_messages")
          .select("id")
          .eq("buyer_conversation_id", conversation.id)
          .eq("sender", "DealHaus")
          .eq("message", sellerDecisionResponse)
          .limit(1)
          .maybeSingle();

      if (relayLookupError) {
        throw relayLookupError;
      }

      if (!alreadyRelayed && sellerDecisionResponse) {
        let currentThreadBody =
  await conversationContainer
    .innerText()
    .catch(() => "");

        if (!currentThreadBody.includes(sellerDecisionResponse)) {
          const relayComposer = page
            .locator(
              '[contenteditable="true"][role="textbox"]'
            )
            .last();

          if (
            !(await relayComposer
              .isVisible()
              .catch(() => false))
          ) {
            throw new Error(
              "Facebook Messenger composer unavailable for seller negotiation result"
            );
          }

          await relayComposer.click();

          await page.keyboard.insertText(
            sellerDecisionResponse
          );

          console.log(
            "\nSENDING VERIFIED SELLER NEGOTIATION RESULT:"
          );
          console.log(sellerDecisionResponse);

          await relayComposer.press("Enter");

          await page.waitForTimeout(2500);

          currentThreadBody =
  await conversationContainer
    .innerText()
    .catch(() => "");

          if (
            !currentThreadBody.includes(
              sellerDecisionResponse
            )
          ) {
            throw new Error(
              "Seller negotiation result was not verified in Facebook after send"
            );
          }
        }

        const { error: relaySaveError } =
          await supabase
            .from("buyer_conversation_messages")
            .insert({
              buyer_conversation_id:
                conversation.id,
              sender: "DealHaus",
              message:
                sellerDecisionResponse,
            });

        if (relaySaveError) {
          throw relaySaveError;
        }

        const relayStage =
          negotiationResult.negotiation_status ===
          "offer_accepted"
            ? "offer_accepted"
            : negotiationResult.negotiation_status ===
              "offer_rejected"
            ? "offer_rejected"
            : "seller_counter_received";

        const { error: relayConversationError } =
          await supabase
            .from("buyer_conversations")
            .update({
              last_message:
                sellerDecisionResponse,
              conversation_stage:
                relayStage,
            })
            .eq("id", conversation.id);

        if (relayConversationError) {
          throw relayConversationError;
        }

        console.log(
          `SELLER RESULT RELAYED TO FACEBOOK BUYER: ${relayStage}`
        );

        continue;
      }

      if (alreadyRespondedAfterNewestBuyerMessage) {
        continue;
      }
    }

    const { data: duplicateMessage, error: duplicateError } =
      await supabase
        .from("buyer_conversation_messages")
        .select("id")
        .eq(
          "buyer_conversation_id",
          conversation.id
        )
        .eq(
          "message",
          newestBuyerMessage.message
        )
        .limit(1)
        .maybeSingle();

    if (duplicateError) throw duplicateError;

    if (duplicateMessage) {
  console.log(
    "Buyer message already exists in DealHaus. Continuing safely in case a previous processing attempt failed."
  );
} else {
  const { error: messageInsertError } =
    await supabase
      .from("buyer_conversation_messages")
      .insert({
        buyer_conversation_id:
          conversation.id,
        sender: buyerName,
        message:
          newestBuyerMessage.message,
      });

  if (messageInsertError) {
    throw messageInsertError;
  }

  console.log(
    "Buyer message saved to DealHaus."
  );
}
const { data: inventoryItem, error: inventoryError } = await supabase
  .from("inventory")
  .select(
    "id,title,description,price,status,deal_stage,seller_city,seller_state"
  )
  .eq("id", publishedTask.inventory_item_id)
  .single();

if (inventoryError) throw inventoryError;

const { data: history, error: historyError } = await supabase
  .from("buyer_conversation_messages")
  .select("sender,message,created_at")
  .eq("buyer_conversation_id", conversation.id)
  .order("created_at", { ascending: true })
  .limit(20);

if (historyError) throw historyError;

const conversationHistory = (history || [])
  .map((message) => `${message.sender}: ${message.message}`)
  .join("\n");

const completion = await openai.chat.completions.create({
  model: "gpt-4.1-mini",
  temperature: 0.3,
  messages: [
    {
      role: "system",
      content: `
You are the DealHaus Facebook Buyer Conversation Agent.

DealHaus is a local AI-powered marketplace brokerage in Las Vegas, Nevada.
Return ONLY valid JSON in exactly this structure:

{
  "intent": "availability|question|offer|pickup|delivery|interested|not_interested|unclear",
  "sentiment": "positive|neutral|negative",
  "needs_human_review": false,
  "ready_for_negotiation": false,
  "response": "message to send to the buyer"
}

Every field is REQUIRED.
Do not omit any field.
Do not include markdown, explanation, or text outside the JSON object.

IMPORTANT:
- The "intent" value MUST be exactly one of these strings and nothing else:
  "availability"
  "question"
  "offer"
  "pickup"
  "delivery"
  "interested"
  "not_interested"
  "unclear"
- Do not return values such as "inquiry_availability", "price_question", or any other variation.

Rules:
- Be friendly, concise, professional, and natural.
- Never say you are AI.
- Never invent listing facts.
- Never invent availability, dimensions, condition, delivery, pickup details, seller details, or pricing.
- Treat the supplied listing title, price, description, status, deal stage, and location as binding source-of-truth facts.
- Preserve conditions, bundles, fees, distances, and exceptions exactly as written in the listing.
- Never separate two terms that the listing makes conditional on each other.
- Example: if the listing says a paid assembly service includes free delivery within a certain distance, DO NOT tell the buyer that delivery itself is free and assembly is optional.
- For delivery, pickup, assembly, fees, warranties, or other operational terms, materially preserve the exact conditions from the listing description.
- If those terms are missing or genuinely ambiguous, set needs_human_review to true instead of interpreting or guessing.
- Never expose private seller information.
- Never claim an item is available unless supplied listing data confirms it.
- Never accept or reject a buyer's lower offer automatically.
- If the buyer proposes another price, classify intent as "offer", set ready_for_negotiation true, and say the offer will be checked.
- If required information is missing or ambiguous, set needs_human_review true rather than guessing.
- Keep most responses under 100 words.
`,
    },
    {
      role: "user",
      content: `
LISTING

Title: ${inventoryItem?.title || publishedTask.item_title}
Price: $${inventoryItem?.price ?? 0}
Description: ${inventoryItem?.description || "Not provided"}
Status: ${inventoryItem?.status || "Not provided"}
Deal stage: ${inventoryItem?.deal_stage || "Not provided"}
Location: ${inventoryItem?.seller_city || ""}, ${inventoryItem?.seller_state || ""}

BUYER

Name: ${buyerName}

RECENT CONVERSATION

${conversationHistory || "No prior messages."}

NEW BUYER MESSAGE

${newestBuyerMessage.message}

Determine the buyer's intent and prepare the correct DealHaus response.
`,
    },
  ],
});

const raw = completion.choices[0]?.message?.content?.trim();

if (!raw) {
  throw new Error("Buyer AI returned an empty decision");
}

const cleaned = raw
  .replace(/^```json\s*/i, "")
  .replace(/```$/i, "")
  .trim();

const decision = JSON.parse(cleaned);
const normalizedBuyerMessage =
  newestBuyerMessage.message.trim().toLowerCase();
let acceptedSellerCounter = false;
let acceptedCounterAmount = null;

if (
  negotiationResult?.negotiation_status === "seller_counter_received"
) {
  const sellerCounterAmount =
    Number(negotiationResult.current_offer || 0);

  const buyerAmountMatch =
    normalizedBuyerMessage.match(
      /\$\s*(\d+(?:\.\d{1,2})?)/
    );

  const buyerAmount = buyerAmountMatch
    ? Number(buyerAmountMatch[1])
    : null;

  const acceptanceLanguage =
    /\b(i'?ll take it|i will take it|i accept|accept|deal|sounds good|works for me|i'?ll do it|i will do it)\b/i.test(
      normalizedBuyerMessage
    );

  const amountMatches =
    buyerAmount === null ||
    buyerAmount === sellerCounterAmount;

  if (
    acceptanceLanguage &&
    amountMatches &&
    sellerCounterAmount > 0
  ) {
    acceptedSellerCounter = true;
    acceptedCounterAmount = sellerCounterAmount;

    decision.intent = "interested";
    decision.sentiment = "positive";
    decision.needs_human_review = false;
    decision.ready_for_negotiation = false;
    decision.response =
      `Great — the $${sellerCounterAmount.toFixed(
        2
      )} price is agreed. I'll help coordinate the next steps.`;
  }
}
const isSimpleAvailabilityQuestion =
  /^(hi[,!]?\s*)?(is this|is it|this still|is this still)\s+(available|for sale)\??$/i.test(
    newestBuyerMessage.message.trim()
  ) ||
  /^(hi[,!]?\s*)?is this available\??$/i.test(
    newestBuyerMessage.message.trim()
  );

if (
  isSimpleAvailabilityQuestion &&
  String(inventoryItem?.status || "").toLowerCase() === "active"
) {
  decision.intent = "availability";
  decision.sentiment = "neutral";
  decision.needs_human_review = false;
  decision.ready_for_negotiation = false;
  decision.response =
    `Hi ${buyerName}! Yes, this is currently available. Let me know if you have any questions about the listing.`;
}

const containsDollarOffer =
  /\$\s*\d+(?:\.\d{1,2})?/.test(normalizedBuyerMessage);

const containsOfferLanguage =
  /\b(would you take|will you take|can you take|take|offer|do \$|accept|lowest|best price)\b/i.test(
    normalizedBuyerMessage
  );

if (
  !acceptedSellerCounter &&
  containsDollarOffer &&
  containsOfferLanguage
) {
  decision.intent = "offer";
  decision.sentiment =
    decision.sentiment || "positive";
  decision.needs_human_review = false;
  decision.ready_for_negotiation = true;

  const offeredAmount =
    normalizedBuyerMessage.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1];

  decision.response = offeredAmount
    ? `Thanks for the offer of $${offeredAmount}. I'll check whether that works and follow up with you shortly.`
    : "Thanks for the offer. I'll check whether that works and follow up with you shortly.";
}

const validIntents = [
  "availability",
  "question",
  "offer",
  "pickup",
  "delivery",
  "interested",
  "not_interested",
  "unclear",
];

if (!validIntents.includes(decision.intent)) {
  throw new Error(`Invalid buyer AI intent: ${decision.intent}`);
}

if (
  !["positive", "neutral", "negative"].includes(
    decision.sentiment
  )
) {
  decision.sentiment = "neutral";
}

if (typeof decision.needs_human_review !== "boolean") {
  throw new Error("Buyer AI decision missing needs_human_review");
}

if (typeof decision.ready_for_negotiation !== "boolean") {
  throw new Error("Buyer AI decision missing ready_for_negotiation");
}

if (
  typeof decision.response !== "string" ||
  !decision.response.trim()
) {
  throw new Error("Buyer AI decision missing response");
}

console.log("\nBUYER AI DECISION:");
console.log(JSON.stringify(decision, null, 2));

// Ambiguous or unsafe situations must stop before Facebook send.
if (decision.needs_human_review === true) {
  const { error: reviewError } = await supabase
    .from("buyer_conversations")
    .update({
      conversation_stage: "needs_human_review",
      last_message: newestBuyerMessage.message,
    })
    .eq("id", conversation.id);

  if (reviewError) throw reviewError;

  console.log("\nHUMAN REVIEW REQUIRED");
  console.log("No Facebook response sent.");
  continue;
}

// Prevent DealHaus from sending the same AI response twice.
const { data: existingAiMessage, error: aiLookupError } =
  await supabase
    .from("buyer_conversation_messages")
    .select("id")
    .eq("buyer_conversation_id", conversation.id)
    .eq("sender", "DealHaus")
    .eq("message", decision.response)
    .limit(1)
    .maybeSingle();

if (aiLookupError) throw aiLookupError;

if (existingAiMessage) {
  console.log("\nDUPLICATE AI RESPONSE BLOCKED");
  console.log(
    "DealHaus already recorded this response. No Facebook send needed."
  );
}

// Make sure the response is not already visible in Facebook.
let currentThreadBody =
  await conversationContainer
    .innerText()
    .catch(() => "");

const priorFacebookResponseVerified =
  alreadyRespondedAfterNewestBuyerMessage &&
  currentThreadBody.includes(decision.response);

if (priorFacebookResponseVerified) {
  console.log(
    "\nEXACT AI RESPONSE ALREADY EXISTS AFTER THIS BUYER MESSAGE"
  );
  console.log(
    "Duplicate Facebook send blocked; continuing database handoff."
  );
}

let buyerResponseVerified =
  priorFacebookResponseVerified;

if (!priorFacebookResponseVerified) {
  const composer = page
    .locator(
      '[contenteditable="true"][role="textbox"]'
    )
    .last();

  if (
    !(await composer
      .isVisible()
      .catch(() => false))
  ) {
    throw new Error(
      "Facebook Messenger composer was not available for buyer response"
    );
  }

  try {
    await composer.click({ timeout: 5000 });
  } catch {
    await composer.evaluate((element) => element.click());
  }

  await composer.focus();

  if (DRY_RUN) {
    console.log(
      "\nDRY RUN — FACEBOOK RESPONSE NOT SENT"
    );
    console.log("WOULD SEND:");
    console.log(decision.response);
    continue;
  }

  await page.keyboard.insertText(
    decision.response
  );

  console.log(
    "\nSENDING BUYER RESPONSE:"
  );
  console.log(decision.response);

  await composer.press("Enter");

  for (
    let verifyAttempt = 1;
    verifyAttempt <= 12;
    verifyAttempt++
  ) {
    await page.waitForTimeout(1000);

    currentThreadBody =
      await conversationContainer
        .innerText()
        .catch(() => "");

    if (
      currentThreadBody.includes(
        decision.response
      )
    ) {
      buyerResponseVerified = true;
      break;
    }

    console.log(
      `WAITING FOR BUYER RESPONSE VERIFICATION ${verifyAttempt}/12`
    );
  }
}

if (!buyerResponseVerified) {
  throw new Error(
    "Exact buyer response was not verified in Facebook after send"
  );
}

console.log(
  priorFacebookResponseVerified
    ? "VERIFIED: PRIOR BUYER RESPONSE EXISTS AFTER EXACT BUYER MESSAGE"
    : "VERIFIED: EXACT BUYER RESPONSE APPEARS IN FACEBOOK THREAD"
);
if (
  acceptedSellerCounter &&
  negotiationResult &&
  acceptedCounterAmount
) {
  const { error: acceptedNegotiationError } =
    await supabase
      .from("negotiation_tasks")
      .update({
        current_offer: acceptedCounterAmount,
        negotiation_status: "offer_accepted",
      })
      .eq("id", negotiationResult.id);

  if (acceptedNegotiationError) {
    throw acceptedNegotiationError;
  }

  const { error: acceptedInventoryError } =
    await supabase
      .from("inventory")
      .update({
        ready_to_close: true,
        deal_stage: "ready_to_close",
      })
      .eq("id", publishedTask.inventory_item_id);

  if (acceptedInventoryError) {
    throw acceptedInventoryError;
  }

  console.log(
    `NEGOTIATION ACCEPTED AT $${acceptedCounterAmount.toFixed(2)}`
  );
  console.log(
    "INVENTORY UPDATED: READY_TO_CLOSE"
  );
}

// Only after Facebook verification, save DealHaus's outbound message.
const { error: aiMessageInsertError } = await supabase
  .from("buyer_conversation_messages")
  .insert({
    buyer_conversation_id: conversation.id,
    sender: "DealHaus",
    message: decision.response,
  });

if (aiMessageInsertError) {
  throw aiMessageInsertError;
}
// Create/update negotiation task using the buyer's ACTUAL offer.
if (decision.ready_for_negotiation === true) {
  const offerMatch =
    newestBuyerMessage.message.match(
      /\$\s*(\d+(?:\.\d{1,2})?)/
    );

  const actualOffer = offerMatch
    ? Number(offerMatch[1])
    : null;

  if (!actualOffer || actualOffer <= 0) {
    throw new Error(
      "Buyer negotiation was triggered but no valid offer amount was found"
    );
  }

  const { data: existingNegotiations, error: negotiationLookupError } =
    await supabase
      .from("negotiation_tasks")
      .select("id,negotiation_status")
      .eq("inventory_item_id", publishedTask.inventory_item_id)
      .eq("buyer_name", buyerName)
      .limit(1);

  if (negotiationLookupError) {
    throw negotiationLookupError;
  }
     let negotiationTaskId = null;
  if (existingNegotiations?.length) {
  negotiationTaskId = existingNegotiations[0].id;
const existingNegotiationStatus =
  existingNegotiations[0].negotiation_status;

if (existingNegotiationStatus === "offer_accepted") {
  console.log(
    `NEGOTIATION ALREADY ACCEPTED — NOT REOPENING ${negotiationTaskId}`
  );
  negotiationTaskId = null;
} else {
  const { error: negotiationUpdateError } =
    await supabase
      .from("negotiation_tasks")
      .update({
        buyer_outreach_task_id: buyerOutreachTask.id,
        current_offer: actualOffer,
        negotiation_status: "buyer_offer_received",
      })
      .eq("id", negotiationTaskId);

  if (negotiationUpdateError) {
    throw negotiationUpdateError;
  }

  console.log(
  `NEGOTIATION UPDATED: BUYER OFFER $${actualOffer}`
);
}
} else {
  const {
    data: insertedNegotiation,
    error: negotiationInsertError,
  } = await supabase
    .from("negotiation_tasks")
    .insert({
      buyer_outreach_task_id: buyerOutreachTask.id,
      inventory_item_id: publishedTask.inventory_item_id,
      item_title:
        inventoryItem?.title || publishedTask.item_title,
      buyer_name: buyerName,
      listing_price: Number(
        publishedTask.listing_price || 0
      ),
      current_offer: actualOffer,
      negotiation_status: "buyer_offer_received",
    })
    .select("id")
    .single();

  if (negotiationInsertError) {
    throw negotiationInsertError;
  }

  negotiationTaskId = insertedNegotiation.id;

  console.log(
    `NEGOTIATION CREATED: BUYER OFFER $${actualOffer}`
  );
}

if (negotiationTaskId) {
  if (DRY_RUN) {
    console.log(
      `DRY RUN — WOULD AUTOMATICALLY START NEGOTIATION AGENT: ${negotiationTaskId}`
    );
  } else {
    console.log(
      `AUTOMATICALLY STARTING NEGOTIATION AGENT: ${negotiationTaskId}`
    );

    const negotiationAgentPath = path.join(
      process.cwd(),
      "scripts",
      "facebook",
      "negotiation-agent.cjs"
    );

    const negotiationResult = spawnSync(
      process.execPath,
      [
        "--env-file=.env.local",
        negotiationAgentPath,
        negotiationTaskId,
      ],
      {
        cwd: process.cwd(),
        stdio: "inherit",
      }
    );

    if (negotiationResult.status !== 0) {
      throw new Error(
        `Negotiation Agent failed with exit code ${negotiationResult.status}`
      );
    }

    console.log("AUTOMATIC NEGOTIATION HANDOFF COMPLETE");
  }
}
}
const existingConversationStage =
  String(
    conversation?.conversation_stage || ""
  ).toLowerCase();

const terminalConversationStages = [
  "offer_accepted",
  "ready_to_close",
  "sold",
  "closed",
];

const nextStage =
  acceptedSellerCounter === true
    ? "offer_accepted"
    : terminalConversationStages.includes(
        existingConversationStage
      )
    ? conversation.conversation_stage
    : decision.ready_for_negotiation === true
    ? "ready_for_negotiation"
    : "buyer_contacted";

const { error: conversationUpdateError } = await supabase
  .from("buyer_conversations")
  .update({
    last_message: decision.response,
    conversation_stage: nextStage,
  })
  .eq("id", conversation.id);

if (conversationUpdateError) {
  throw conversationUpdateError;
}

console.log(
  `DEALHAUS UPDATED: ${nextStage.toUpperCase()}`
);
  }

  console.log("\nBUYER AGENT RUN COMPLETE");
  console.log(
    "Verified buyer-side threads found:",
    buyerThreadsFound
  );
  console.log("Buyer Agent run finished.");

  await context.close();
})().catch((error) => {
  console.error(
    "\nBUYER AGENT FAILED:",
    error.message
  );
  process.exit(1);
});


