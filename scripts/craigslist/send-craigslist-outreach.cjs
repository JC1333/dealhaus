const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const LEAD_ID = process.argv[2];

if (!LEAD_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\craigslist\\send-craigslist-outreach.cjs <seller_lead_id>"
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

  const resend = new Resend(
    process.env.RESEND_API_KEY
  );

  const { data: lead, error: leadError } =
    await supabase
      .from("seller_leads")
      .select(
        "id,item_title,seller_name,seller_email,platform,marketplace_listing_url,outreach_message,outreach_status"
      )
      .eq("id", LEAD_ID)
      .single();

  if (leadError) throw leadError;
  if (!lead) {
    throw new Error("Craigslist seller lead not found.");
  }

  if (!/craigslist/i.test(lead.platform || "")) {
    throw new Error(
      `Craigslist sender refuses non-Craigslist lead: ${lead.platform}`
    );
  }

  if (
    !lead.marketplace_listing_url ||
    !/craigslist\.org/i.test(
      lead.marketplace_listing_url
    )
  ) {
    throw new Error(
      "Lead does not contain a valid Craigslist listing URL."
    );
  }

  if (!lead.outreach_message) {
    throw new Error(
      "Lead has no DealHaus outreach message."
    );
  }

  if (lead.outreach_status === "contacted") {
    throw new Error(
      "Lead is already marked contacted. Duplicate Craigslist send blocked."
    );
  }

  console.log("\nDEALHAUS CRAIGSLIST OUTREACH");
  console.log("----------------------------");
  console.log("Lead:", lead.item_title);
  console.log("URL:", lead.marketplace_listing_url);

  const browser = await chromium.launch({
    headless: false,
  });

  let relayEmail = "";

  try {
    const page = await browser.newPage();

    await page.goto(
      lead.marketplace_listing_url,
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    await page.waitForTimeout(3000);

    const bodyText =
      await page.locator("body").innerText();

    if (
      lead.item_title &&
      !normalizeText(bodyText)
        .toLowerCase()
        .includes(
          normalizeText(
            lead.item_title
          ).toLowerCase()
        )
    ) {
      throw new Error(
        "Exact Craigslist listing title could not be verified before outreach."
      );
    }

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
      "VERIFIED CRAIGSLIST RELAY:",
      relayEmail
    );
  } finally {
    await browser.close();
  }

  const subject =
    `DealHaus Seller Outreach [${lead.id}] — ${lead.item_title}`;

  console.log("\nSENDING CRAIGSLIST OUTREACH:");
  console.log(lead.outreach_message);
  console.log("\nTO:", relayEmail);
  console.log("SUBJECT:", subject);

  const { data: sendData, error: sendError } =
    await resend.emails.send({
      from: "DealHaus Support <support@dealhaus.us>",
      to: relayEmail,
      subject,
      text: lead.outreach_message,
    });

  if (sendError) {
    throw new Error(
      sendError.message || "Craigslist email send failed."
    );
  }

  if (!sendData?.id) {
    throw new Error(
      "Craigslist email send was not confirmed by Resend."
    );
  }

  console.log(
    "\nVERIFIED: RESEND ACCEPTED CRAIGSLIST OUTREACH"
  );
  console.log("RESEND ID:", sendData.id);

  const { error: leadUpdateError } =
    await supabase
      .from("seller_leads")
      .update({
        seller_email: relayEmail,
        outreach_status: "contacted",
      })
      .eq("id", LEAD_ID);

  if (leadUpdateError) {
    throw leadUpdateError;
  }

  const { data: tasks, error: taskLookupError } =
    await supabase
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
          send_status: "awaiting_response",
          attempt_count:
            (tasks[0].attempt_count || 0) + 1,
        })
        .eq("id", tasks[0].id);

    if (taskUpdateError) {
      throw taskUpdateError;
    }
  }

  console.log(
    "DEALHAUS UPDATED: CRAIGSLIST CONTACTED / AWAITING RESPONSE"
  );
})().catch((error) => {
  console.error(
    "\nCRAIGSLIST SEND FAILED:",
    error.message
  );
  process.exit(1);
});
