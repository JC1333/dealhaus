const { chromium } = require("playwright");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const LEAD_ID = process.argv[2];

if (!LEAD_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\offerup\\send-offerup-message.cjs <seller_lead_id>"
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
      "id,item_title,seller_name,marketplace_listing_url,outreach_message,outreach_status,lead_source"
    )
    .eq("id", LEAD_ID)
    .single();

  if (leadError) throw leadError;

  if (!lead) {
    throw new Error("OfferUp seller lead not found.");
  }

  if (!lead.marketplace_listing_url) {
    throw new Error("Lead has no marketplace listing URL.");
  }

  if (!/https?:\/\/([^/]+\.)?offerup\.com\//i.test(
    lead.marketplace_listing_url
  )) {
    throw new Error(
      `OfferUp sender refuses non-OfferUp URL: ${lead.marketplace_listing_url}`
    );
  }

  if (!lead.outreach_message) {
    throw new Error("Lead has no DealHaus outreach message.");
  }

  if (lead.outreach_status === "contacted") {
    throw new Error(
      "Lead is already marked contacted. Duplicate OfferUp send blocked."
    );
  }

  console.log("\nDEALHAUS OFFERUP OUTREACH");
  console.log("-------------------------");
  console.log("Lead:", lead.item_title);
  console.log("Seller:", lead.seller_name || "Unknown");
  console.log("URL:", lead.marketplace_listing_url);

  const profileDir = path.join(
    process.cwd(),
    ".dealhaus-offerup-profile"
  );

  const context = await chromium.launchPersistentContext(
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

    await page.goto(lead.marketplace_listing_url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(4000);

    const pageText =
      await page.locator("body").innerText();

    if (
      lead.item_title &&
      !pageText
        .toLowerCase()
        .includes(lead.item_title.toLowerCase())
    ) {
      throw new Error(
        "Exact OfferUp listing title could not be verified before outreach."
      );
    }

    const askButton = page.getByRole(
      "button",
      {
        name: "Ask",
        exact: true,
      }
    );

    if (
      !(await askButton
        .isVisible()
        .catch(() => false))
    ) {
      throw new Error(
        "OfferUp Ask button was not available on the exact listing."
      );
    }

    await askButton.click();

    await page.waitForTimeout(1500);

    const composer = page
      .locator("textarea")
      .filter({ visible: true })
      .last();

    if (
      !(await composer
        .isVisible()
        .catch(() => false))
    ) {
      throw new Error(
        "OfferUp custom message textarea did not appear."
      );
    }

    await composer.fill(
      lead.outreach_message
    );

    console.log("\nSENDING DEALHAUS OFFERUP OUTREACH:");
    console.log(lead.outreach_message);

    const sendButton = page
      .getByRole("button", {
        name: "Send",
        exact: true,
      });

    if (
      !(await sendButton
        .isVisible()
        .catch(() => false))
    ) {
      throw new Error(
        "OfferUp Send button was not available."
      );
    }

    await sendButton.click();

    await page.waitForTimeout(3500);

    const bodyAfterSend =
      await page.locator("body").innerText();

    const normalizedBodyAfterSend =
      bodyAfterSend.replace(/\s+/g, " ").trim();

    const normalizedOutreachMessage =
      lead.outreach_message.replace(/\s+/g, " ").trim();

    if (
      !normalizedBodyAfterSend.includes(
        normalizedOutreachMessage
      )
    ) {
      throw new Error(
        "Exact DealHaus outreach was not externally verified after OfferUp send."
      );
    }

    console.log(
      "\nVERIFIED: EXACT DEALHAUS MESSAGE APPEARS ON OFFERUP"
    );

    const { error: leadUpdateError } =
      await supabase
        .from("seller_leads")
        .update({
          outreach_status: "contacted",
        })
        .eq("id", LEAD_ID)
        .neq("outreach_status", "contacted");

    if (leadUpdateError) {
      throw leadUpdateError;
    }

    const {
      data: tasks,
      error: taskLookupError,
    } = await supabase
      .from("outreach_tasks")
      .select("id,attempt_count")
      .eq("seller_lead_id", LEAD_ID)
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (taskLookupError) {
      throw taskLookupError;
    }

    if (tasks?.[0]) {
      const { error: taskUpdateError } =
        await supabase
          .from("outreach_tasks")
          .update({
            send_status:
              "awaiting_response",
            attempt_count:
              (tasks[0].attempt_count || 0) +
              1,
          })
          .eq("id", tasks[0].id);

      if (taskUpdateError) {
        throw taskUpdateError;
      }
    }

    console.log(
      "DEALHAUS UPDATED: OFFERUP CONTACTED / AWAITING RESPONSE"
    );
  } finally {
    await context.close();
  }
})().catch((error) => {
  console.error(
    "\nOFFERUP SEND FAILED:",
    error.message
  );
  process.exit(1);
});

