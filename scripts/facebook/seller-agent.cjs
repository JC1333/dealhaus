const { chromium } = require("playwright");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const LEAD_ID = process.argv[2];
const TEST_MODE = process.argv.includes("--test");

if (!LEAD_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\facebook\\seller-agent.cjs <seller_lead_id>"
  );
  process.exit(1);
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value) {
  return String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getSellerNameFromConversationTitle(
  conversationTitle,
  itemTitle
) {
  const suffix = ` · ${itemTitle}`;

  if (conversationTitle.endsWith(suffix)) {
    return conversationTitle
      .slice(0, -suffix.length)
      .trim();
  }

  const separatorIndex =
    conversationTitle.indexOf(" · ");

  if (separatorIndex > 0) {
    return conversationTitle
      .slice(0, separatorIndex)
      .trim();
  }

  return "";
}

async function openMarketplaceInbox(page) {
  console.log("\nOpening Facebook Messenger...");

  try {
    await page.goto(
      "https://www.facebook.com/messages/",
      {
        waitUntil: "commit",
        timeout: 30000,
      }
    );
  } catch (error) {
    console.log(
      "Messenger navigation warning:",
      error.message
    );
  }

  await page.waitForTimeout(5000);

  console.log(
    "Messenger navigation completed. Opening Marketplace inbox..."
  );

  for (let attempt = 1; attempt <= 20; attempt++) {
    const marketplace = page
      .getByText("Marketplace", { exact: true })
      .first();

    if (
      await marketplace
        .isVisible()
        .catch(() => false)
    ) {
      await marketplace.click().catch(() => {});
      await page.waitForTimeout(3000);
      return;
    }

    console.log(
      `WAITING FOR MARKETPLACE ${attempt}/20`
    );

    await page.waitForTimeout(2000);
  }

  throw new Error(
    "Facebook Marketplace inbox did not become available"
  );
}

async function findExactMarketplaceConversation(
  page,
  itemTitle
) {
  const rowSelector =
    'a[role="link"][aria-label^="Group chat: "]';

  const normalizedItemTitle =
    normalizeText(itemTitle);

  console.log(
    `Searching for exact Marketplace conversation: ${itemTitle}`
  );

  for (let pass = 1; pass <= 30; pass++) {
    const rows = page.locator(rowSelector);
    const count = await rows.count();

    console.log(
      `MARKETPLACE SEARCH ${pass}/30 — visible rows: ${count}`
    );

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);

      const aria =
        (await row.getAttribute("aria-label")) || "";

      const href =
        (await row.getAttribute("href")) || "";

      const normalizedAria =
        normalizeText(aria);

      if (
        normalizedAria.includes(
          normalizedItemTitle
        )
      ) {
        const conversationTitle = aria
          .replace(/^Group chat:\s*/i, "")
          .trim();

        console.log(
          "\nEXACT MARKETPLACE CONVERSATION FOUND"
        );
        console.log(
          "Conversation:",
          conversationTitle
        );
        console.log("Thread:", href);

        return {
          row,
          href,
          aria,
          conversationTitle,
          sellerName:
            getSellerNameFromConversationTitle(
              conversationTitle,
              itemTitle
            ),
        };
      }
    }

    /*
      Facebook virtualizes Marketplace conversations.
      Scroll the last rendered row so older threads
      can be loaded into the sidebar.
    */
    if (count > 0) {
      const lastRow = rows.nth(count - 1);

      await lastRow
        .scrollIntoViewIfNeeded()
        .catch(() => {});

      await lastRow
        .hover()
        .catch(() => {});

      await page.mouse.wheel(0, 1200);
    } else {
      await page.mouse.wheel(0, 1200);
    }

    await page.waitForTimeout(2500);
  }

  throw new Error(
    `Exact Marketplace conversation for "${itemTitle}" was not found`
  );
}

async function clickAndVerifyExactConversation(
  page,
  conversation
) {
  console.log(
    "\nOpening exact seller conversation..."
  );

  await conversation.row.click({
    timeout: 15000,
    force: true,
  });

  const expectedConversationAria =
    `Messages in conversation titled ${conversation.conversationTitle}`;

  for (let attempt = 1; attempt <= 15; attempt++) {
    const containers = page.locator(
      '[aria-label^="Messages in conversation titled "]'
    );

    const count = await containers.count();

    for (let i = 0; i < count; i++) {
      const container = containers.nth(i);

      const aria =
        (await container.getAttribute(
          "aria-label"
        )) || "";

      if (
        normalizeText(aria) ===
        normalizeText(expectedConversationAria)
      ) {
        console.log(
          "VERIFIED: EXACT SELLER CONVERSATION IS ACTIVE"
        );
        console.log(
          "Seller:",
          conversation.sellerName || "Unknown"
        );

        return container;
      }
    }

    console.log(
      `WAITING FOR EXACT SELLER THREAD ${attempt}/15`
    );

    await page.waitForTimeout(1000);
  }

  throw new Error(
    `Facebook opened a conversation, but the exact active thread "${conversation.conversationTitle}" could not be verified`
  );
}

async function getActiveThreadMessages(
  conversationContainer
) {
  const messageElements =
    conversationContainer.locator(
      '[aria-label^="Enter, Message sent"]'
    );

  const count =
    await messageElements.count();

  const messages = [];

  for (let i = 0; i < count; i++) {
    const aria =
      (await messageElements
        .nth(i)
        .getAttribute("aria-label")) || "";

    if (!aria) {
      continue;
    }

    const match = aria.match(
      /^Enter, Message sent .* by ([^:]+):\s*(.+)$/s
    );

    if (!match) {
      continue;
    }

    messages.push({
      sender: match[1].trim(),
      message: match[2].trim(),
      aria,
    });
  }

  return messages;
}

async function verifyExactResponseInThread(
  conversationContainer,
  response
) {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const messages =
      await getActiveThreadMessages(
        conversationContainer
      );

    if (
      messages.some(
        (message) =>
          message.sender.toLowerCase() === "you" &&
          message.message === response
      )
    ) {
      return true;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );
  }

  return false;
}

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: lead, error: leadError } =
    await supabase
      .from("seller_leads")
      .select(
        "id,item_title,seller_name,seller_city,seller_state,asking_price,estimated_profit,marketplace_listing_url,outreach_message,outreach_status,status,commission_rate,outreach_notes"
      )
      .eq("id", LEAD_ID)
      .single();

  if (leadError) {
    throw leadError;
  }

  if (!lead) {
    throw new Error("Seller lead not found");
  }

  console.log("\nDEALHAUS SELLER AGENT");
  console.log("---------------------");
  console.log("Lead:", lead.item_title);
  console.log("Status:", lead.status);
  console.log(
    "Outreach:",
    lead.outreach_status
  );

  if (
    lead.outreach_status !== "contacted" &&
    !TEST_MODE
  ) {
    throw new Error(
      `Seller agent requires a contacted lead. Current outreach status: ${lead.outreach_status}`
    );
  }

  if (!lead.item_title) {
    throw new Error(
      "Seller lead is missing item_title"
    );
  }

  if (!lead.outreach_message) {
    throw new Error(
      "Seller lead is missing DealHaus outreach_message"
    );
  }

  if (
    lead.marketplace_listing_url &&
    !/facebook\.com/i.test(lead.marketplace_listing_url)
  ) {
    throw new Error(
      `Facebook Seller Agent cannot process non-Facebook listing URL: ${lead.marketplace_listing_url}`
    );
  }
  const profileDir = path.join(
    process.cwd(),
    ".dealhaus-facebook-profile"
  );

  const context =
    await chromium.launchPersistentContext(
      profileDir,
      {
        headless: false,
        viewport: null,
        args: ["--start-maximized"],
      }
    );

  try {
    const page =
      context.pages()[0] ||
      (await context.newPage());

    await openMarketplaceInbox(page);

    const conversation =
      await findExactMarketplaceConversation(
        page,
        lead.item_title
      );

    const conversationContainer =
      await clickAndVerifyExactConversation(
        page,
        conversation
      );

    /*
      From this point forward, NEVER parse the
      entire Messenger page body.

      Only messages inside the exact verified
      active conversation are allowed.
    */
    const threadMessages =
      await getActiveThreadMessages(
        conversationContainer
      );

    console.log(
      `Active-thread messages found: ${threadMessages.length}`
    );

    if (!threadMessages.length) {
      throw new Error(
        "Exact seller conversation opened, but no active-thread messages could be read"
      );
    }

    /*
      Find the exact DealHaus outreach message
      inside this verified seller conversation.
    */
    let outreachIndex = -1;

    for (
      let i = threadMessages.length - 1;
      i >= 0;
      i--
    ) {
      const message =
        threadMessages[i];

      if (
        message.sender.toLowerCase() === "you" &&
        normalizeText(message.message) ===
          normalizeText(
            lead.outreach_message
          )
      ) {
        outreachIndex = i;
        break;
      }
    }

    if (outreachIndex === -1) {
      throw new Error(
        "DealHaus outreach message could not be verified inside the exact seller conversation"
      );
    }

    console.log(
      "DealHaus outreach verified inside exact seller thread."
    );

    /*
      Only inspect actual messages AFTER the
      verified DealHaus outreach.
    */
    const sellerMessages =
      threadMessages
        .slice(outreachIndex + 1)
        .filter(
          (message) =>
            message.sender.toLowerCase() !== "you"
        );

    if (sellerMessages.length === 0) {
      console.log(
        "\nNO NEW SELLER REPLY YET"
      );
      console.log(
        "Seller agent will take no action."
      );
      return;
    }

    const newestSellerMessage =
      sellerMessages[
        sellerMessages.length - 1
      ];
      const newestSellerThreadIndex =
  threadMessages.findLastIndex(
    (message) =>
      message.aria === newestSellerMessage.aria
  );

if (newestSellerThreadIndex === -1) {
  throw new Error(
    "Newest seller reply could not be anchored inside the exact verified thread."
  );
}

const alreadyRespondedAfterNewestSellerReply =
  threadMessages
    .slice(newestSellerThreadIndex + 1)
    .some(
      (message) =>
        message.sender.toLowerCase() === "you"
    );

if (alreadyRespondedAfterNewestSellerReply) {
  console.log(
    "SAFETY: DealHaus/You already responded after this seller reply."
  );
}

    /*
      Extra sender safety:
      when Facebook gives us the seller name from
      the exact row, reject any different sender.
    */
    if (
      conversation.sellerName &&
      normalizeText(
        newestSellerMessage.sender
      ) !==
        normalizeText(
          conversation.sellerName
        )
    ) {
      throw new Error(
        `Seller thread sender mismatch. Expected "${conversation.sellerName}" but received "${newestSellerMessage.sender}". No action taken.`
      );
    }

    console.log(
      "\nNEW SELLER REPLY DETECTED"
    );
    console.log(
      "Sender:",
      newestSellerMessage.sender
    );
    console.log(
      "Message:",
      newestSellerMessage.message
    );

    const processedReplyMarker =
      `Facebook seller reply: ${newestSellerMessage.message}`;

    if (
      typeof lead.outreach_notes ===
        "string" &&
      lead.outreach_notes.includes(
        processedReplyMarker
      )
    ) {
      console.log(
        "\nDUPLICATE REPLY BLOCKED"
      );
      console.log(
        "This seller reply was already processed by DealHaus."
      );
      return;
    }

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `
You are the DealHaus Seller Conversation Agent.

DealHaus is a new local AI-powered marketplace brokerage in Las Vegas, Nevada.
The seller keeps possession of the item.
There are no upfront fees.
DealHaus earns a ${lead.commission_rate || 10}% commission only if DealHaus helps sell the item.

Return ONLY valid JSON:

{
  "intent": "interested|question|commission_question|not_interested|unclear",
  "sentiment": "positive|neutral|negative",
  "should_continue": true,
  "seller_agreed": false,
  "needs_human_review": false,
  "response": "message to send"
}

Rules:
- Never claim DealHaus already has a buyer unless verified.
- Never promise a sale.
- Never say DealHaus buys the item.
- A generic yes does not automatically mean agreement.
- seller_agreed can only be true when the seller clearly authorizes DealHaus to proceed under the commission arrangement.
- If unclear, set needs_human_review to true.
- Keep responses concise and natural.
`,
          },
          {
            role: "user",
            content: `
Item: ${lead.item_title}

Seller: ${
              conversation.sellerName ||
              lead.seller_name ||
              "Seller"
            }

DealHaus outreach:
${lead.outreach_message}

Seller reply:
${newestSellerMessage.message}

Determine the correct next action.
`,
          },
        ],
      });

    const raw =
      completion.choices[0]?.message?.content?.trim();

    if (!raw) {
      throw new Error(
        "AI returned an empty decision"
      );
    }

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const decision =
      JSON.parse(cleaned);

    const requiredBooleanFields = [
      "should_continue",
      "seller_agreed",
      "needs_human_review",
    ];

    for (
      const field of requiredBooleanFields
    ) {
      if (
        typeof decision[field] !==
        "boolean"
      ) {
        throw new Error(
          `Seller AI decision missing boolean field: ${field}`
        );
      }
    }

    if (
      typeof decision.response !==
        "string" ||
      !decision.response.trim()
    ) {
      throw new Error(
        "Seller AI decision missing response"
      );
    }

    console.log("\nAI DECISION");
    console.log(
      JSON.stringify(
        decision,
        null,
        2
      )
    );

    if (TEST_MODE) {
      console.log(
        "\nTEST MODE: NO RESPONSE SENT AND NO DATABASE CHANGES MADE"
      );
      return;
    }

    /*
      Human-review cases stop BEFORE any Facebook
      response is sent.
    */
    if (
      decision.needs_human_review
    ) {
      const { error: reviewError } =
        await supabase
          .from("seller_leads")
          .update({
            status: "needs_review",
            outreach_status:
              "follow_up_needed",
            outreach_notes:
              `Seller reply needs human review: ${newestSellerMessage.message}`,
          })
          .eq("id", LEAD_ID);

      if (reviewError) {
        throw reviewError;
      }

      console.log(
        "\nHUMAN REVIEW REQUIRED"
      );
      console.log(
        "No Facebook response sent."
      );

      return;
    }

    /*
      We are still inside the exact verified
      seller conversation.
    */
    let responseVerified = false;

if (alreadyRespondedAfterNewestSellerReply) {
  console.log(
    "\nDUPLICATE OUTBOUND SEND BLOCKED"
  );
  console.log(
    "A DealHaus/You response already exists after this exact seller reply."
  );
  console.log(
    "Skipping Facebook send and continuing the database handoff."
  );

  responseVerified = true;
} else {
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
      "Facebook seller conversation composer is unavailable"
    );
  }

  await composer.click();

  await page.keyboard.insertText(
    decision.response
  );

  console.log(
    "\nSENDING AI RESPONSE:"
  );
  console.log(decision.response);

  await composer.press("Enter");

  await page.waitForTimeout(2500);

  responseVerified =
    await verifyExactResponseInThread(
      conversationContainer,
      decision.response
    );

  if (!responseVerified) {
    throw new Error(
      "AI response was not verified inside the exact seller conversation after send"
    );
  }

  console.log(
    "VERIFIED: EXACT AI RESPONSE APPEARS IN EXACT SELLER THREAD"
  );
}

    /*
      Only after external Facebook verification
      may DealHaus update its database.
    */
    const {
      data: tasks,
      error: taskLookupError,
    } = await supabase
      .from("outreach_tasks")
      .select("id")
      .eq("seller_lead_id", LEAD_ID)
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (taskLookupError) {
      throw taskLookupError;
    }

    if (tasks?.[0]) {
      const {
        error: taskUpdateError,
      } = await supabase
        .from("outreach_tasks")
        .update({
          send_status:
            "seller_replied",
        })
        .eq("id", tasks[0].id);

      if (taskUpdateError) {
        throw taskUpdateError;
      }
    }

    /*
      Seller explicitly declined.
    */
    if (
      decision.intent ===
        "not_interested" ||
      decision.should_continue ===
        false
    ) {
      const { error } =
        await supabase
          .from("seller_leads")
          .update({
            status: "rejected",
            outreach_status:
              "not_interested",
            outreach_notes:
              processedReplyMarker,
          })
          .eq("id", LEAD_ID);

      if (error) {
        throw error;
      }

      console.log(
        "PIPELINE UPDATED: SELLER NOT INTERESTED / STOPPED"
      );

      return;
    }

    /*
      Seller explicitly authorized DealHaus.
    */
    if (
      decision.seller_agreed === true
    ) {
      const {
        error: leadApprovalError,
      } = await supabase
        .from("seller_leads")
        .update({
          seller_name:
            lead.seller_name ||
            conversation.sellerName ||
            null,
          status:
            "seller_approved",
          outreach_status:
            "seller_approved",
          approval_status:
            "approved",
          agreement_accepted: true,
          approval_notes:
            `Seller explicitly agreed through Facebook Marketplace. Reply: ${newestSellerMessage.message}`,
          outreach_notes:
            processedReplyMarker,
        })
        .eq("id", LEAD_ID);

      if (leadApprovalError) {
        throw leadApprovalError;
      }

      const {
        data: existingPrepTasks,
        error: prepLookupError,
      } = await supabase
        .from("listing_prep_tasks")
        .select("id")
        .eq(
          "seller_lead_id",
          LEAD_ID
        )
        .limit(1);

      if (prepLookupError) {
        throw prepLookupError;
      }

      if (
        !existingPrepTasks?.length
      ) {
        const {
          error: prepInsertError,
        } = await supabase
          .from(
            "listing_prep_tasks"
          )
          .insert({
            seller_lead_id:
              lead.id,
            item_title:
              lead.item_title,
            seller_name:
              lead.seller_name ||
              conversation.sellerName ||
              null,
            seller_city:
              lead.seller_city,
            seller_state:
              lead.seller_state,
            asking_price:
              lead.asking_price,
            estimated_profit:
              lead.estimated_profit,
            prep_status:
              "ready_for_relist",
          });

        if (prepInsertError) {
          throw prepInsertError;
        }
      }

      const {
        error: relistStatusError,
      } = await supabase
        .from("seller_leads")
        .update({
          status:
            "sent_to_relist_queue",
        })
        .eq("id", LEAD_ID);

      if (relistStatusError) {
        throw relistStatusError;
      }

      console.log(
        "PIPELINE UPDATED: SELLER AGREEMENT ACCEPTED / SENT TO RELIST QUEUE"
      );

      return;
    }

    /*
      Conversation continues but seller has not
      authorized DealHaus yet.
    */
    const {
      error: continueError,
    } = await supabase
      .from("seller_leads")
      .update({
        seller_name:
          lead.seller_name ||
          conversation.sellerName ||
          null,
        outreach_status:
          "seller_responded",
        outreach_notes:
          processedReplyMarker,
      })
      .eq("id", LEAD_ID);

    if (continueError) {
      throw continueError;
    }

    console.log(
      "PIPELINE UPDATED: CONVERSATION CONTINUES"
    );
  } finally {
    await context.close().catch(() => {});
  }
})().catch((error) => {
  console.error(
    "\nSELLER AGENT FAILED:",
    error.message
  );

  process.exit(1);
});
