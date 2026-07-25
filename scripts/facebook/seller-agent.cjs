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

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: lead, error: leadError } = await supabase
    .from("seller_leads")
  .select(
  "id,item_title,seller_name,seller_city,seller_state,asking_price,estimated_profit,marketplace_listing_url,outreach_message,outreach_status,status,commission_rate,outreach_notes"
)
    .eq("id", LEAD_ID)
    .single();

  if (leadError) throw leadError;
  if (!lead) throw new Error("Seller lead not found");

  console.log("\nDEALHAUS SELLER AGENT");
  console.log("---------------------");
  console.log("Lead:", lead.item_title);
  console.log("Status:", lead.status);
  console.log("Outreach:", lead.outreach_status);

  if (lead.outreach_status !== "contacted" && !TEST_MODE) {
  throw new Error(
    `Seller agent requires a contacted lead. Current outreach status: ${lead.outreach_status}`
  );
}

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

console.log("Messenger navigation completed. Checking page...");

  let body = "";

  for (let attempt = 1; attempt <= 30; attempt++) {
    await page.waitForTimeout(2000);

    body = await page.locator("body").innerText();

    if (body.includes(lead.item_title)) {
      console.log("Marketplace conversation found.");
      break;
    }

    const marketplace = page
      .getByText("Marketplace", { exact: true })
      .first();

    if (await marketplace.isVisible().catch(() => false)) {
      await marketplace.click().catch(() => {});
    }

    console.log(`Waiting for conversation ${attempt}/30`);
  }

  if (!body.includes(lead.item_title)) {
    throw new Error(
      `Marketplace conversation for "${lead.item_title}" did not render`
    );
  }

  const thread = page
    .getByText(new RegExp(lead.item_title, "i"))
    .first();

  await thread.click({ timeout: 15000, force: true });
  await page.waitForTimeout(2500);

  const threadBody = await page.locator("body").innerText();

  if (!threadBody.includes(lead.outreach_message)) {
    throw new Error(
      "DealHaus outreach message could not be verified in this conversation"
    );
  }

  console.log("DealHaus outreach verified.");

// Only inspect messages that appeared AFTER the verified DealHaus outreach.
const outreachPosition = threadBody.lastIndexOf(lead.outreach_message);

if (outreachPosition === -1) {
  throw new Error("Could not locate DealHaus outreach position in thread");
}

const afterOutreach = threadBody.slice(
  outreachPosition + lead.outreach_message.length
);

const messageLines = afterOutreach
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const sellerMessages = [];

for (const line of messageLines) {
  const match = line.match(
    /^Enter, Message sent .* by ([^:]+):\s*(.+)$/
  );

  if (!match) continue;

  const sender = match[1].trim();
  const message = match[2].trim();

  if (sender.toLowerCase() === "you") {
    continue;
  }

  sellerMessages.push({
    sender,
    message,
  });
}

if (sellerMessages.length === 0) {
  console.log("\nNO NEW SELLER REPLY YET");
  console.log("Seller agent will take no action.");

  await context.close();
  return;
}

const newestSellerMessage =
  sellerMessages[sellerMessages.length - 1];

console.log("\nNEW SELLER REPLY DETECTED");
console.log("Sender:", newestSellerMessage.sender);
console.log("Message:", newestSellerMessage.message);

const processedReplyMarker =
  `Facebook seller reply: ${newestSellerMessage.message}`;

if (
  typeof lead.outreach_notes === "string" &&
  lead.outreach_notes.includes(processedReplyMarker)
) {
  console.log("\nDUPLICATE REPLY BLOCKED");
  console.log("This seller reply was already processed by DealHaus.");

  await context.close();
  return;
}


const completion = await openai.chat.completions.create({
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
- seller_agreed can only be true when the seller clearly authorizes DealHaus to proceed under the 10% commission arrangement.
- If unclear, set needs_human_review to true.
- Keep responses concise and natural.
`,
    },
    {
      role: "user",
      content: `
Item: ${lead.item_title}

DealHaus outreach:
${lead.outreach_message}

Seller reply:
${newestSellerMessage.message}

Determine the correct next action.
`,
    },
  ],
});

const raw = completion.choices[0]?.message?.content?.trim();

if (!raw) {
  throw new Error("AI returned an empty decision");
}

const cleaned = raw
  .replace(/^```json\s*/i, "")
  .replace(/```$/i, "")
  .trim();

const decision = JSON.parse(cleaned);

console.log("\nAI DECISION");
console.log(JSON.stringify(decision, null, 2));

if (TEST_MODE) {
  console.log("\nTEST MODE: NO RESPONSE SENT AND NO DATABASE CHANGES MADE");
  await context.close();
  return;
}

// Human-review cases stop here. Nothing is sent automatically.
if (decision.needs_human_review) {
  const { error: reviewError } = await supabase
    .from("seller_leads")
    .update({
      status: "needs_review",
      outreach_status: "follow_up_needed",
      outreach_notes: `Seller reply needs human review: ${newestSellerMessage.message}`,
    })
    .eq("id", LEAD_ID);

  if (reviewError) throw reviewError;

  console.log("\nHUMAN REVIEW REQUIRED");
  console.log("No Facebook response sent.");

  await context.close();
  return;
}

// Send the AI response in the REAL Facebook conversation.
const composer = page
  .locator('[contenteditable="true"][role="textbox"]')
  .last();

await composer.click();
await page.keyboard.insertText(decision.response);

console.log("\nSENDING AI RESPONSE:");
console.log(decision.response);

await composer.press("Enter");
await page.waitForTimeout(2500);

// Verify the exact response exists externally before updating DealHaus.
const verifiedBody = await page.locator("body").innerText();

if (!verifiedBody.includes(decision.response)) {
  throw new Error(
    "AI response was not verified in Facebook after send"
  );
}

console.log("VERIFIED: EXACT AI RESPONSE APPEARS IN FACEBOOK THREAD");

// Update outreach task to reflect a real seller response.
const { data: tasks, error: taskLookupError } = await supabase
  .from("outreach_tasks")
  .select("id")
  .eq("seller_lead_id", LEAD_ID)
  .order("created_at", { ascending: false })
  .limit(1);

if (taskLookupError) throw taskLookupError;

if (tasks?.[0]) {
  const { error: taskUpdateError } = await supabase
    .from("outreach_tasks")
    .update({
      send_status: "seller_replied",
    })
    .eq("id", tasks[0].id);

  if (taskUpdateError) throw taskUpdateError;
}

// Seller explicitly declined.
if (
  decision.intent === "not_interested" ||
  decision.should_continue === false
) {
  const { error } = await supabase
    .from("seller_leads")
    .update({
      status: "rejected",
      outreach_status: "not_interested",
      outreach_notes: `Facebook seller reply: ${newestSellerMessage.message}`,
    })
    .eq("id", LEAD_ID);

  if (error) throw error;

  console.log("PIPELINE UPDATED: SELLER NOT INTERESTED / STOPPED");

  await context.close();
  return;
}

// Seller explicitly authorized DealHaus under the commission arrangement.
if (decision.seller_agreed === true) {
  const { error: leadApprovalError } = await supabase
    .from("seller_leads")
    .update({
      status: "seller_approved",
      outreach_status: "seller_approved",
      approval_status: "approved",
      agreement_accepted: true,
      approval_notes: `Seller explicitly agreed through Facebook Marketplace. Reply: ${newestSellerMessage.message}`,
    })
    .eq("id", LEAD_ID);

  if (leadApprovalError) throw leadApprovalError;

  const { data: existingPrepTasks, error: prepLookupError } = await supabase
    .from("listing_prep_tasks")
    .select("id")
    .eq("seller_lead_id", LEAD_ID)
    .limit(1);

  if (prepLookupError) throw prepLookupError;

  if (!existingPrepTasks?.length) {
    const { error: prepInsertError } = await supabase
      .from("listing_prep_tasks")
      .insert({
        seller_lead_id: lead.id,
        item_title: lead.item_title,
        seller_name: lead.seller_name,
        seller_city: lead.seller_city,
        seller_state: lead.seller_state,
        asking_price: lead.asking_price,
        estimated_profit: lead.estimated_profit,
        prep_status: "ready_for_relist",
      });

    if (prepInsertError) throw prepInsertError;
  }

  const { error: relistStatusError } = await supabase
    .from("seller_leads")
    .update({
      status: "sent_to_relist_queue",
    })
    .eq("id", LEAD_ID);

  if (relistStatusError) throw relistStatusError;

  console.log(
    "PIPELINE UPDATED: SELLER AGREEMENT ACCEPTED / SENT TO RELIST QUEUE"
  );

  await context.close();
  return;
}


// Conversation continues, but seller has not authorized DealHaus yet.
const { error: continueError } = await supabase
  .from("seller_leads")
  .update({
    outreach_status: "seller_responded",
    outreach_notes: `Facebook seller reply: ${newestSellerMessage.message}`,
  })
  .eq("id", LEAD_ID);

if (continueError) throw continueError;

console.log("PIPELINE UPDATED: CONVERSATION CONTINUES");

await context.close();

await context.close();
})().catch((error) => {
  console.error("\nSELLER AGENT FAILED:", error.message);
  process.exit(1);
});
