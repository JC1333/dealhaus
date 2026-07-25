const { chromium } = require("playwright");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const LEAD_ID = process.argv[2];

if (!LEAD_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\facebook\\send-marketplace-message.cjs <seller_lead_id>"
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
      "id,item_title,marketplace_listing_url,outreach_message,outreach_status"
    )
    .eq("id", LEAD_ID)
    .single();

  if (leadError) throw leadError;

  if (!lead?.marketplace_listing_url) {
    throw new Error("Lead has no Facebook Marketplace URL");
  }

  if (!lead?.outreach_message) {
    throw new Error("Lead has no DealHaus outreach message");
  }

  if (lead.outreach_status === "contacted") {
    throw new Error(
      "Lead is already marked contacted. Refusing to send a duplicate message."
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

  // Open the real Marketplace listing first.
  await page.goto(lead.marketplace_listing_url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  // Start the Marketplace conversation with Facebook's initial message.
  const messageBox = page.locator("textarea").last();

  await messageBox.focus();

  const defaultMessage = await messageBox.inputValue();

  if (defaultMessage) {
    await messageBox.press("Control+A");
    await messageBox.press("Backspace");
  }

  // Use Facebook's initial message only to establish the conversation.
  await page.keyboard.insertText("Hello, is this still available?");

  const initialSendButton = page
    .locator('[role="button"][aria-label^="Send message to "]:visible')
    .first();

  await initialSendButton.click({ timeout: 15000 });

  await page.waitForTimeout(2500);

  // Open Messenger so we can send the REAL DealHaus introduction.
  await page.goto("https://www.facebook.com/messages/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  let body = "";

  for (let attempt = 1; attempt <= 15; attempt++) {
    await page.waitForTimeout(2000);

    body = await page.locator("body").innerText();

    if (body.includes(lead.item_title)) {
      break;
    }

    const marketplace = page
      .getByText("Marketplace", { exact: true })
      .first();

    if (await marketplace.isVisible().catch(() => false)) {
      await marketplace.click().catch(() => {});
    }

    console.log(
      `WAITING FOR MARKETPLACE THREAD ${attempt}/15`
    );
  }

  if (!body.includes(lead.item_title)) {
    throw new Error(
      `Marketplace conversation for "${lead.item_title}" did not render`
    );
  }

  // Open the conversation matching this exact DealHaus lead.
  const thread = page
    .getByText(new RegExp(lead.item_title, "i"))
    .first();

  await thread.click({ timeout: 15000 });

  await page.waitForTimeout(2000);

  let threadBody = await page.locator("body").innerText();

  // Never duplicate the DealHaus introduction.
  if (threadBody.includes(lead.outreach_message)) {
    throw new Error(
      "Exact DealHaus outreach already exists in this Facebook conversation. Duplicate send blocked."
    );
  }

  const composer = page
    .locator('[contenteditable="true"][role="textbox"]')
    .last();

  await composer.click();

  await page.keyboard.insertText(lead.outreach_message);

  console.log("\nSENDING DEALHAUS OUTREACH:");
  console.log(lead.outreach_message);

  await composer.press("Enter");

  await page.waitForTimeout(2500);

  threadBody = await page.locator("body").innerText();

  if (!threadBody.includes(lead.outreach_message)) {
    throw new Error(
      "Exact DealHaus outreach was not verified in the Facebook conversation after send"
    );
  }

  console.log(
    "\nVERIFIED: EXACT DEALHAUS MESSAGE APPEARS IN FACEBOOK THREAD"
  );

  // Update DealHaus ONLY after external verification.
  const { error: leadUpdateError } = await supabase
    .from("seller_leads")
    .update({
      outreach_status: "contacted",
    })
    .eq("id", LEAD_ID);

  if (leadUpdateError) throw leadUpdateError;

  const { data: tasks, error: taskLookupError } = await supabase
    .from("outreach_tasks")
    .select("id,attempt_count")
    .eq("seller_lead_id", LEAD_ID)
    .order("created_at", { ascending: false })
    .limit(1);

  if (taskLookupError) throw taskLookupError;

  if (tasks?.[0]) {
    const { error: taskUpdateError } = await supabase
      .from("outreach_tasks")
      .update({
        send_status: "awaiting_response",
        attempt_count: (tasks[0].attempt_count || 0) + 1,
      })
      .eq("id", tasks[0].id);

    if (taskUpdateError) throw taskUpdateError;
  }

  console.log(
    "DEALHAUS UPDATED: CONTACTED / AWAITING RESPONSE"
  );

  await context.close();
})().catch((error) => {
  console.error("SEND FAILED:", error.message);
  process.exit(1);
});