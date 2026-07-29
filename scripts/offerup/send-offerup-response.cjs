const { chromium } = require("playwright");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const LEAD_ID = process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");
const RESPONSE_TEXT = process.argv.slice(3).filter((arg) => arg !== "--dry-run").join(" ").trim();

if (!LEAD_ID || !RESPONSE_TEXT) {
  console.error(
    'Usage: node --env-file=.env.local scripts\\offerup\\send-offerup-response.cjs <seller_lead_id> "response text"'
  );
  process.exit(1);
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: lead, error: leadError } = await supabase
    .from("seller_leads")
    .select(
      "id,item_title,seller_name,platform,marketplace_listing_url,outreach_message,outreach_status"
    )
    .eq("id", LEAD_ID)
    .single();

  if (leadError) throw leadError;

  if (!lead) {
    throw new Error("OfferUp seller lead not found.");
  }

  if (!/offerup/i.test(lead.platform || "")) {
    throw new Error(
      `OfferUp response sender refuses non-OfferUp lead: ${lead.platform}`
    );
  }

  if (!lead.seller_name) {
    throw new Error("OfferUp lead is missing seller_name.");
  }

  console.log("\nDEALHAUS OFFERUP SELLER RESPONSE");
  console.log("--------------------------------");
  console.log("Lead:", lead.item_title);
  console.log("Seller:", lead.seller_name);

  const context = await chromium.launchPersistentContext(
    path.join(process.cwd(), ".dealhaus-offerup-profile"),
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

    await page.goto("https://offerup.com/inbox", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    let name = null;

for (let attempt = 1; attempt <= 15; attempt++) {
  await page.waitForTimeout(1000);

  const candidate = page
    .getByText(lead.seller_name, {
      exact: true,
    })
    .first();

  if (
    await candidate
      .isVisible()
      .catch(() => false)
  ) {
    name = candidate;
    console.log(
      `OFFERUP SELLER ROW FOUND ${attempt}/15`
    );
    break;
  }

  console.log(
    `WAITING FOR OFFERUP SELLER ROW ${attempt}/15`
  );
}

if (!name) {
  throw new Error(
    `Exact OfferUp inbox row for seller "${lead.seller_name}" was not found.`
  );
}

    const row = name.locator(
      'xpath=ancestor::div[@role="button"][1]'
    );

    await row.evaluate((el) => el.click());

    let chatMessages = [];

    for (let attempt = 1; attempt <= 10; attempt++) {
      await page.waitForTimeout(1000);

      chatMessages = await page
        .locator(
          '[data-testid^="MessagingChatPageMessagingChatMessage"][data-testid$=".Content-Text"]'
        )
        .allTextContents();

      console.log(
        `OFFERUP MESSAGE LOAD ${attempt}/10: ${chatMessages.length}`
      );

      if (chatMessages.length) {
        break;
      }
    }
const normalizedOutreach =
  normalizeText(lead.outreach_message || "");

if (
  !normalizedOutreach ||
  !chatMessages.some(
    (message) =>
      normalizeText(message) === normalizedOutreach
  )
) {
  throw new Error(
    "Exact DealHaus outreach could not be verified in the reopened OfferUp thread. No response sent."
  );
}
    const normalizedResponse =
      normalizeText(RESPONSE_TEXT);

    if (
      chatMessages.some(
        (message) =>
          normalizeText(message) ===
          normalizedResponse
      )
    ) {
      throw new Error(
        "Exact AI response already exists in the OfferUp thread. Duplicate send blocked."
      );
    }

    const composer = page
      .locator('textarea[placeholder="Message..."]')
      .first();

    if (
      !(await composer
        .isVisible()
        .catch(() => false))
    ) {
      throw new Error(
        "OfferUp seller-response composer was not available."
      );
    }

    if (DRY_RUN) {
      console.log("\nOFFERUP RESPONSE DRY RUN VERIFIED");
      console.log("Exact seller thread opened.");
      console.log("Real chat history loaded.");
      console.log("Duplicate response check passed.");
      console.log("Seller-response composer verified.");
      console.log("NO MESSAGE WAS SENT.");
      return;
    }

    await composer.fill(RESPONSE_TEXT);

    console.log("\nSENDING OFFERUP SELLER RESPONSE:");
    console.log(RESPONSE_TEXT);

    const sendButton = page
      .locator('button[type="submit"]')
      .filter({ visible: true })
      .first();

    if (
      !(await sendButton
        .isVisible()
        .catch(() => false))
    ) {
      throw new Error(
        "OfferUp seller-response Send button was not available."
      );
    }

    await sendButton.click();

    let verified = false;

    for (let attempt = 1; attempt <= 10; attempt++) {
      await page.waitForTimeout(1000);

      const messagesAfterSend = await page
        .locator(
          '[data-testid^="MessagingChatPageMessagingChatMessage"][data-testid$=".Content-Text"]'
        )
        .allTextContents();

      if (
        messagesAfterSend.some(
          (message) =>
            normalizeText(message) ===
            normalizedResponse
        )
      ) {
        verified = true;
        break;
      }

      console.log(
        `WAITING FOR OFFERUP RESPONSE VERIFICATION ${attempt}/10`
      );
    }

    if (!verified) {
      throw new Error(
        "Exact AI response was not externally verified in OfferUp after send."
      );
    }

    console.log(
      "\nVERIFIED: EXACT AI RESPONSE APPEARS IN OFFERUP THREAD"
    );
  } finally {
    await context.close();
  }
})().catch((error) => {
  console.error(
    "\nOFFERUP RESPONSE SEND FAILED:",
    error.message
  );
  process.exit(1);
});

