const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LEAD_ID = process.argv[2];

if (!LEAD_ID) {
  console.error(
    'Usage: node --env-file=.env.local scripts\\facebook\\process-seller-response.cjs <seller_lead_id> "seller message"'
  );
  process.exit(1);
}

async function processSellerResponse(sellerMessage) {
  const { data: lead, error } = await supabase
    .from("seller_leads")
    .select("*")
    .eq("id", LEAD_ID)
    .single();

  if (error) throw error;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `
You are the DealHaus Seller Negotiation Agent.

DealHaus helps marketplace sellers promote and relist their items.
DealHaus does not buy the item and does not own inventory.

For this lead, DealHaus earns a ${lead.commission_rate || 10}% commission only if the item sells.

Your job is to understand the seller's reply and determine the correct next action.

Return ONLY valid JSON in this exact structure:

{
  "intent": "interested|question|commission_question|not_interested|unclear",
  "sentiment": "positive|neutral|negative",
  "should_continue": true,
  "seller_agreed": false,
  "needs_human_review": false,
  "response": "message to send to seller"
}

Rules:
- Never claim DealHaus already has a buyer unless verified data says so.
- Never promise the item will sell.
- Never say DealHaus buys the item.
- Never invent prices, buyers, fees, guarantees, or terms.
- Clearly explain DealHaus only earns commission if the item sells.
- Keep responses conversational and concise.
- If the seller clearly declines, should_continue must be false.
- seller_agreed can only be true when the seller clearly agrees to DealHaus helping sell/promote/relist the item under the commission arrangement.
- A generic "yes" is NOT enough to establish agreement unless the conversation clearly shows what they are agreeing to.
- If the meaning is ambiguous, set needs_human_review to true.
`,
      },
      {
        role: "user",
        content: `
Marketplace lead:

Item: ${lead.item_title}
Asking price: $${lead.asking_price || 0}
City: ${lead.seller_city || ""}
Commission: ${lead.commission_rate || 10}%

DealHaus outreach:
${lead.outreach_message || ""}

Seller's newest reply:
${sellerMessage}

Determine the seller's intent and prepare the appropriate next response.
`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();

  if (!raw) throw new Error("AI returned an empty response");

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const decision = JSON.parse(cleaned);
const normalizedSellerMessage = sellerMessage.trim().toLowerCase();

if (
  ["yes", "yeah", "yep", "sure", "ok", "okay"].includes(
    normalizedSellerMessage
  )
) {
  decision.intent = "interested";
  decision.sentiment = "positive";
  decision.should_continue = true;
  decision.seller_agreed = false;
  decision.needs_human_review = false;

  decision.response =
  `Great! DealHaus can help promote and relist your ${lead.item_title} to reach more potential buyers. There are no upfront fees â€” DealHaus only earns a ${lead.commission_rate || 10}% commission if the item sells. If you're comfortable with that, just confirm you'd like DealHaus to move forward and we'll get started.`;
}

const validIntents = [
  "interested",
  "question",
  "commission_question",
  "not_interested",
  "unclear",
];

const validSentiments = [
  "positive",
  "neutral",
  "negative",
];

if (!validIntents.includes(decision.intent)) {
  throw new Error(`Invalid AI intent: ${decision.intent}`);
}

if (!validSentiments.includes(decision.sentiment)) {
  decision.sentiment = "neutral";
}

if (typeof decision.should_continue !== "boolean") {
  throw new Error("AI decision missing should_continue");
}

if (typeof decision.seller_agreed !== "boolean") {
  throw new Error("AI decision missing seller_agreed");
}

if (typeof decision.needs_human_review !== "boolean") {
  throw new Error("AI decision missing needs_human_review");
}

if (
  typeof decision.response !== "string" ||
  !decision.response.trim()
) {
  throw new Error("AI decision missing response");
}

console.log("\nSELLER MESSAGE:");
  console.log(sellerMessage);

  console.log("\nDEALHAUS AI DECISION:");
  console.log(JSON.stringify(decision, null, 2));
if (decision.intent === "not_interested") {
  const { error: leadUpdateError } = await supabase
    .from("seller_leads")
    .update({
      status: "rejected",
      outreach_status: "not_interested",
      outreach_notes: `Facebook seller reply: ${sellerMessage}`,
    })
    .eq("id", LEAD_ID);

  if (leadUpdateError) throw leadUpdateError;

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

  console.log("\nDEALHAUS PIPELINE UPDATED:");
  console.log("Seller marked NOT INTERESTED / REJECTED");
}
  return decision;
}

const sellerMessage = process.argv.slice(3).join(" ").trim();

if (!sellerMessage) {
  console.log(
    'Usage: node --env-file=.env.local scripts\\facebook\\process-seller-response.cjs <seller_lead_id> "seller message"'
  );
  process.exit(0);
}

processSellerResponse(sellerMessage).catch((error) => {
  console.error("PROCESSING FAILED:", error.message);
  process.exit(1);
});
