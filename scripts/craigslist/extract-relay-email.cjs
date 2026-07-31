const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const LEAD_ID = process.argv[2];

if (!LEAD_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\craigslist\\extract-relay-email.cjs <seller_lead_id>"
  );
  process.exit(1);
}

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: lead, error } = await supabase
    .from("seller_leads")
    .select(
      "id,item_title,marketplace_listing_url,marketplace_source,lead_source"
    )
    .eq("id", LEAD_ID)
    .single();

  if (error) throw error;
  if (!lead) throw new Error("Seller lead not found.");

  const listingUrl = String(
    lead.marketplace_listing_url || ""
  ).trim();

  if (
    !listingUrl ||
    !/craigslist\.org/i.test(listingUrl)
  ) {
    throw new Error(
      "Lead does not contain a valid Craigslist listing URL."
    );
  }

  console.log("\nDEALHAUS CRAIGSLIST RELAY EXTRACTOR");
  console.log("-----------------------------------");
  console.log("Lead:", lead.item_title);
  console.log("URL:", listingUrl);

  const browser = await chromium.launch({
    headless: false,
  });

  try {
    const page = await browser.newPage();

    await page.goto(listingUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const replyButton = page.getByRole(
      "button",
      {
        name: "reply",
        exact: true,
      }
    );

    if (
      !(await replyButton
        .isVisible()
        .catch(() => false))
    ) {
      throw new Error(
        "Craigslist Reply button was not available."
      );
    }

    await replyButton.click();

    let emailHeader = null;

    for (let attempt = 1; attempt <= 20; attempt++) {
      await page.waitForTimeout(1000);

      const headers =
        page.locator("button.reply-option-header");

      const count = await headers.count();

      console.log(
        `CRAIGSLIST REPLY LOAD ${attempt}/20: ${count} option headers`
      );

      for (let i = 0; i < count; i++) {
        const text = String(
          await headers.nth(i).innerText()
        )
          .trim()
          .toLowerCase();

        if (text === "email") {
          emailHeader = headers.nth(i);
          break;
        }
      }

      if (emailHeader) {
        break;
      }
    }

    if (!emailHeader) {
      throw new Error(
        "Craigslist Email reply option did not render."
      );
    }

    await emailHeader.evaluate(
      (element) => element.click()
    );

    let relayEmail = "";

    for (let attempt = 1; attempt <= 15; attempt++) {
      await page.waitForTimeout(1000);

      const emailLink = page
        .locator(
          ".reply-content-email .reply-email-address a[href^='mailto:']"
        )
        .first();

      if (
        await emailLink
          .isVisible()
          .catch(() => false)
      ) {
        const href =
          (await emailLink.getAttribute("href")) ||
          "";

        relayEmail = decodeURIComponent(
          href
            .replace(/^mailto:/i, "")
            .split("?")[0]
        )
          .trim()
          .toLowerCase();

        if (relayEmail) {
          break;
        }
      }

      console.log(
        `WAITING FOR CRAIGSLIST RELAY EMAIL ${attempt}/15`
      );
    }

    if (
      !relayEmail ||
      !/@(?:sale\.)?craigslist\.org$/i.test(
        relayEmail
      )
    ) {
      throw new Error(
        "Valid Craigslist relay email was not found."
      );
    }

    console.log(
      "\nVERIFIED CRAIGSLIST RELAY EMAIL:",
      relayEmail
    );
    console.log("NO EMAIL WAS SENT.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(
    "\nCRAIGSLIST RELAY EXTRACTION FAILED:",
    error.message
  );
  process.exit(1);
});
