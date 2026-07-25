const { chromium } = require("playwright");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const LEAD_ID = process.argv[2];
const RESPONSE_TEXT = process.argv.slice(3).join(" ").trim();

if (!LEAD_ID || !RESPONSE_TEXT) {
  console.error(
    'Usage: node --env-file=.env.local scripts\\facebook\\send-seller-response.cjs <seller_lead_id> "response text"'
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
    .select("id,item_title,outreach_status")
    .eq("id", LEAD_ID)
    .single();

  if (leadError) throw leadError;
  if (!lead) throw new Error("Seller lead not found");

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

  await page.goto("https://www.facebook.com/messages/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  let body = "";

  for (let attempt = 1; attempt <= 20; attempt++) {
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

    console.log(`WAITING FOR THREAD ${attempt}/20`);
  }

  if (!body.includes(lead.item_title)) {
    throw new Error(
      `Marketplace thread for "${lead.item_title}" did not render`
    );
  }

  const thread = page
    .getByText(new RegExp(lead.item_title, "i"))
    .first();

  await thread.click({ timeout: 15000 });
  await page.waitForTimeout(2000);

  let threadBody = await page.locator("body").innerText();

  if (threadBody.includes(RESPONSE_TEXT)) {
    throw new Error("Exact response already exists in the thread");
  }

  const composer = page
    .locator('[contenteditable="true"][role="textbox"]')
    .last();

  await composer.click();
  await page.keyboard.insertText(RESPONSE_TEXT);

  console.log("\nSENDING SELLER RESPONSE:");
  console.log(RESPONSE_TEXT);

  await composer.press("Enter");

  await page.waitForTimeout(2500);

  threadBody = await page.locator("body").innerText();

  if (!threadBody.includes(RESPONSE_TEXT)) {
    throw new Error(
      "Exact seller response was not verified in Facebook after send"
    );
  }

  console.log(
    "\nVERIFIED: EXACT SELLER RESPONSE APPEARS IN FACEBOOK THREAD"
  );

  await context.close();
})().catch((error) => {
  console.error("RESPONSE SEND FAILED:", error.message);
  process.exit(1);
});