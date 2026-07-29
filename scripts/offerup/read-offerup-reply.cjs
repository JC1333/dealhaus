const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const { spawnSync } = require("child_process");

const LEAD_ID = process.argv[2];
const SIMULATED_REPLY = String(process.env.DEALHAUS_SIMULATED_SELLER_REPLY || "").trim();

if (!LEAD_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\offerup\\read-offerup-reply.cjs <seller_lead_id>"
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
      "id,item_title,seller_name,marketplace_listing_url,outreach_message,outreach_status,platform,outreach_notes"
    )
    .eq("id", LEAD_ID)
    .single();

  if (leadError) throw leadError;

  if (!lead) {
    throw new Error("OfferUp seller lead not found.");
  }

  if (!/offerup/i.test(lead.platform || "")) {
    throw new Error(
      `OfferUp reply reader refuses non-OfferUp lead platform: ${lead.platform}`
    );
  }

  if (!lead.outreach_message) {
    throw new Error("Lead has no DealHaus outreach message.");
  }

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

    await page.waitForTimeout(5000);

    const sellerName = String(
      lead.seller_name || ""
    ).trim();

    if (!sellerName) {
      throw new Error(
        "OfferUp lead is missing seller_name."
      );
    }

    const name = page
      .getByText(sellerName, {
        exact: true,
      })
      .first();

    if (
      !(await name
        .isVisible()
        .catch(() => false))
    ) {
      throw new Error(
        `Exact OfferUp inbox row for seller "${sellerName}" was not found.`
      );
    }

    const row = name.locator(
      'xpath=ancestor::div[@role="button"][1]'
    );

    await row.evaluate((el) => el.click());
    await page.waitForTimeout(4000);

    for (let attempt = 1; attempt <= 10; attempt++) {
      const realMessageCount = await page
        .locator(
          '[data-testid^="MessagingChatPageMessagingChatMessage"][data-testid$=".Content-Text"]'
        )
        .count();

      console.log(
        `OFFERUP MESSAGE LOAD ${attempt}/10: ${realMessageCount}`
      );

      if (realMessageCount > 0) {
        break;
      }

      await page.waitForTimeout(1000);
    }

    const body =
      await page.locator("body").innerText();

    const normalizedBody =
      normalizeText(body);

    const normalizedOutreach =
      normalizeText(lead.outreach_message);

    if (
      !normalizedBody.includes(
        normalizedOutreach
      )
    ) {
      throw new Error(
        "Exact DealHaus outreach could not be verified in the OfferUp thread."
      );
    }

    if (
      lead.item_title &&
      !normalizedBody
        .toLowerCase()
        .includes(
          normalizeText(
            lead.item_title
          ).toLowerCase()
        )
    ) {
      console.log(
        "WARNING: Item title was not visible in the current OfferUp thread view."
      );
    }

    console.log("\nDEALHAUS OFFERUP REPLY READER");
    console.log("-----------------------------");
    console.log("Seller:", sellerName);
    console.log("Thread:", page.url());
    console.log(
      "VERIFIED: Exact DealHaus outreach exists in the seller thread."
    );

    /*
      Read ONLY real OfferUp chat-message text nodes.
      This excludes controls, safety tips, navigation,
      Delivered/Seen labels, and item-detail buttons.
    */
    const chatMessages = await page
      .locator(
        '[data-testid^="MessagingChatPageMessagingChatMessage"][data-testid$=".Content-Text"]'
      )
      .evaluateAll((els) =>
        els.map((el) => ({
          text: (el.innerText || "").trim(),
          testid:
            el.getAttribute("data-testid") || "",
        }))
      );

    console.log(
      `Real OfferUp chat messages found: ${chatMessages.length}`
    );

    const outreachIndex =
      chatMessages.findIndex(
        (message) =>
          normalizeText(message.text) ===
          normalizedOutreach
      );

    if (outreachIndex === -1) {
      throw new Error(
        "DealHaus outreach exists in page text but was not found as a real OfferUp chat message."
      );
    }

    console.log(
      "DealHaus outreach verified as a real OfferUp chat message."
    );

    const messagesAfterOutreach =
      chatMessages.slice(outreachIndex + 1);

    if (
      !messagesAfterOutreach.length &&
      !SIMULATED_REPLY
    ) {
      console.log(
        "NO NEW OFFERUP REPLY DETECTED"
      );
      return;
    }

    const newestSellerMessage =
      SIMULATED_REPLY
        ? normalizeText(SIMULATED_REPLY)
        : normalizeText(
            messagesAfterOutreach[
              messagesAfterOutreach.length - 1
            ].text
          );
const processedReplyMarker =
  `OfferUp seller reply: ${newestSellerMessage}`;

if (
  typeof lead.outreach_notes === "string" &&
  lead.outreach_notes.includes(processedReplyMarker)
) {
  console.log(
    "DUPLICATE OFFERUP SELLER REPLY BLOCKED"
  );
  return;
}
    if (SIMULATED_REPLY) {
      console.log(
        "CONTROLLED OFFERUP SELLER REPLY SIMULATION ACTIVE"
      );
    }


    console.log(
      "NEW OFFERUP SELLER MESSAGE:",
      newestSellerMessage
    );

    const processorPath = path.join(
      process.cwd(),
      "scripts",
      "facebook",
      "process-seller-response.cjs"
    );

    const result = spawnSync(
      process.execPath,
      [
        "--env-file=.env.local",
        processorPath,
        LEAD_ID,
        newestSellerMessage,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
      }
    );

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(
        `Seller Negotiation Agent failed with exit code ${result.status}`
      );
    }

    const decisionLine = String(
      result.stdout || ""
    )
      .split(/\r?\n/)
      .find((line) =>
        line.startsWith(
          "DEALHAUS_SELLER_DECISION_JSON:"
        )
      );

    if (!decisionLine) {
      throw new Error(
        "Seller Negotiation Agent did not return a machine-readable decision."
      );
    }

    const decision = JSON.parse(
      decisionLine.replace(
        "DEALHAUS_SELLER_DECISION_JSON:",
        ""
      )
    );

    console.log(
      "OFFERUP SELLER MESSAGE PROCESSED BY DEALHAUS AI"
    );

    if (
      decision.needs_human_review === true ||
      decision.should_continue === false
    ) {
      console.log(
        "NO AUTOMATIC OFFERUP RESPONSE SENT"
      );
      return;
    }

    const responseSenderPath = path.join(
      process.cwd(),
      "scripts",
      "offerup",
      "send-offerup-response.cjs"
    );

    console.log(
      "Closing OfferUp reply-reader browser before response sender..."
    );

    await context.close();

    const sendResult = spawnSync(
      process.execPath,
      [
        "--env-file=.env.local",
        responseSenderPath,
        LEAD_ID,
        decision.response,
        ...(SIMULATED_REPLY ? ["--dry-run"] : []),
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      }
    );

    if (sendResult.error) {
      throw sendResult.error;
    }

    if (sendResult.status !== 0) {
      throw new Error(
        `OfferUp response sender failed with exit code ${sendResult.status}`
      );
    }

    console.log(
      SIMULATED_REPLY ? "OFFERUP AI RESPONSE PATH VERIFIED IN DRY RUN - NOTHING SENT" : "OFFERUP AI RESPONSE SENT AND VERIFIED"
    );
    if (!SIMULATED_REPLY) {
  const updatedOutreachNotes = [
    lead.outreach_notes,
    processedReplyMarker,
  ]
    .filter(Boolean)
    .join("\n");

  const { error: processedReplyError } =
    await supabase
      .from("seller_leads")
      .update({
        outreach_notes: updatedOutreachNotes,
      })
      .eq("id", LEAD_ID);

  if (processedReplyError) {
    throw processedReplyError;
  }

  console.log(
    "OFFERUP SELLER REPLY MARKED PROCESSED"
  );
}
  } finally {
    await context.close();
  }
})().catch((error) => {
  console.error(
    "\nOFFERUP REPLY READER FAILED:",
    error.message
  );
  process.exit(1);
});




