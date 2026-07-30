const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRANSACTION_ID =
  process.argv[2];

if (!TRANSACTION_ID) {
  console.error(
    "CLOSING REPLY PROCESSOR FAILED: Transaction ID is required."
  );
  process.exit(1);
}

function parseMessageAria(aria) {
  const match = String(aria || "").match(
    /^Enter, Message sent .* by ([^:]+):\s*(.+)$/s
  );

  if (!match) {
    return null;
  }

  return {
    sender: match[1].trim(),
    message: match[2].trim(),
    raw: aria,
  };
}

(async () => {
  let context = null;

  try {
    console.log("\nDEALHAUS CLOSING REPLY PROCESSOR");
    console.log("---------------------------------");
    console.log("ARIA MESSAGE SOURCE-OF-TRUTH MODE");
    console.log("No Facebook messages will be sent.");
    console.log("Seller will not be contacted in this stage.");

    // ------------------------------------------
    // LOAD AND VERIFY TRANSACTION
    // ------------------------------------------

    const { data: tx, error: txError } =
      await supabase
        .from("brokerage_transactions")
        .select("*")
        .eq("id", TRANSACTION_ID)
        .single();

    if (txError) {
      throw txError;
    }

    if (
      tx.meetup_status !==
      "buyer_coordination_started"
    ) {
      console.log(
        "\nTRANSACTION NOT WAITING FOR BUYER REPLY"
      );
      console.log(
        "Current meetup_status:",
        tx.meetup_status
      );
      console.log("No action taken.");
      return;
    }

    const {
      data: inventory,
      error: inventoryError,
    } = await supabase
      .from("inventory")
      .select("id,title")
      .eq("id", tx.inventory_item_id)
      .single();

    if (inventoryError) {
      throw inventoryError;
    }

    const buyerName =
      String(tx.buyer_name || "").trim();

    const itemTitle =
      String(inventory.title || "").trim();

    if (!buyerName || !itemTitle) {
      throw new Error(
        "Buyer or inventory identity is missing."
      );
    }

    console.log("Buyer:", buyerName);
    console.log("Item:", itemTitle);

    // Use a stable ASCII substring.
    // This deliberately ignores the corrupted dash character
    // that exists in the already-sent Facebook message.
    const closingMessageMarker =
      `Great, ${buyerName}`;

    const closingMessageConfirmation =
      "purchase price is confirmed";

    // ------------------------------------------
    // OPEN FACEBOOK
    // ------------------------------------------

    context =
      await chromium.launchPersistentContext(
        path.join(
          process.cwd(),
          ".dealhaus-facebook-profile"
        ),
        {
          headless: false,
          viewport: null,
          args: ["--start-maximized"],
        }
      );

    const page =
      context.pages()[0] ||
      (await context.newPage());

    console.log("\nOpening Facebook Messenger...");

    await page.goto(
      "https://www.facebook.com/messages/",
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    await page.waitForTimeout(4000);

    // ------------------------------------------
    // OPEN MARKETPLACE INBOX
    // ------------------------------------------

        let marketplaceOpened = false;

    for (
      let attempt = 1;
      attempt <= 20;
      attempt++
    ) {
      const marketplace = page
        .getByText("Marketplace", {
          exact: true,
        })
        .first();

      if (
        await marketplace
          .isVisible()
          .catch(() => false)
      ) {
        console.log(
          "MARKETPLACE CONTROL FOUND"
        );

        await marketplace.evaluate((el) => el.click());

        await page.waitForTimeout(3000);

        marketplaceOpened = true;

        console.log(
          "MARKETPLACE INBOX OPENED"
        );

        break;
      }

      console.log(
        `WAITING FOR MARKETPLACE ${attempt}/20`
      );

      await page.waitForTimeout(2000);
    }

    if (!marketplaceOpened) {
      throw new Error(
        "Marketplace inbox did not open. Buyer search aborted to prevent opening the wrong Messenger conversation."
      );
    }

    // ------------------------------------------
    // FIND EXACT BUYER + ITEM THREAD
    // ------------------------------------------

    let exactRow = null;
    let facebookConversationTitle = null;

    for (
      let attempt = 1;
      attempt <= 30;
      attempt++
    ) {
      const rows = page.locator(
        'a[role="link"][aria-label^="Group chat:"]'
      );

      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);

        const aria =
          (await row
            .getAttribute("aria-label")
            .catch(() => "")) || "";

        const title = aria
          .replace(
            /^Group chat:\s*/i,
            ""
          )
          .trim();

        const normalizedTitle =
          title.toLowerCase();

        if (
          normalizedTitle.includes(
            buyerName.toLowerCase()
          ) &&
          normalizedTitle.includes(
            itemTitle.toLowerCase()
          )
        ) {
          exactRow = row;
          facebookConversationTitle = title;
          break;
        }
      }

      if (exactRow) {
  break;
}

if (count > 0) {
  const lastRow = rows.nth(count - 1);

  await lastRow
    .scrollIntoViewIfNeeded()
    .catch(() => {});

  await page.mouse.wheel(0, 1200);
}

console.log(
  `WAITING FOR EXACT BUYER ROW ${attempt}/30`
);

await page.waitForTimeout(1000);
    }

    if (
      !exactRow ||
      !facebookConversationTitle
    ) {
      throw new Error(
        "Exact buyer Marketplace conversation was not found."
      );
    }

    console.log(
      "FACEBOOK EXACT CONVERSATION:",
      facebookConversationTitle
    );

    await exactRow.click({
      timeout: 15000,
      force: true,
    });

    // ------------------------------------------
    // VERIFY EXACT CONVERSATION CONTAINER
    // ------------------------------------------

    const container = page.locator(
      `[aria-label="Messages in conversation titled ${facebookConversationTitle}"]`
    );

    let containerVerified = false;

    for (
      let attempt = 1;
      attempt <= 20;
      attempt++
    ) {
      if (
        await container
          .isVisible()
          .catch(() => false)
      ) {
        containerVerified = true;
        break;
      }

      console.log(
        `WAITING FOR EXACT BUYER THREAD ${attempt}/20`
      );

      await page.waitForTimeout(1000);
    }

    if (!containerVerified) {
      throw new Error(
        "Exact buyer conversation container was not available."
      );
    }

    console.log(
      "VERIFIED: EXACT BUYER CONVERSATION IS ACTIVE"
    );

    // ------------------------------------------
    // SINGLE SOURCE OF TRUTH:
    // ARIA MESSAGE ELEMENTS ONLY
    // ------------------------------------------

    const messageElements =
      container.locator(
        '[aria-label^="Enter, Message sent"]'
      );

    let finalAriaSnapshot = [];
    let previousSnapshotKey = "";
    let stablePasses = 0;
    let closingMessageFound = false;

    for (
      let attempt = 1;
      attempt <= 30;
      attempt++
    ) {
      await page.waitForTimeout(1000);

      const count =
        await messageElements.count();

      const ariaSnapshot = [];

      for (
        let messageIndex = 0;
        messageIndex < count;
        messageIndex++
      ) {
        const aria =
          (await messageElements
            .nth(messageIndex)
            .getAttribute("aria-label")
            .catch(() => "")) || "";

        if (aria) {
          ariaSnapshot.push(aria);
        }
      }

      closingMessageFound =
        ariaSnapshot.some((aria) => {
          return (
            aria.includes(
              `by You: ${closingMessageMarker}`
            ) &&
            aria.includes(
              closingMessageConfirmation
            )
          );
        });

      const snapshotKey =
        ariaSnapshot.join("\n");

      if (
        snapshotKey &&
        snapshotKey === previousSnapshotKey
      ) {
        stablePasses++;
      } else {
        stablePasses = 0;
      }

      previousSnapshotKey =
        snapshotKey;

      console.log(
        `ARIA LOAD CHECK ${attempt}/30: ` +
        `${ariaSnapshot.length} MESSAGE ELEMENTS, ` +
        `CLOSING=${closingMessageFound ? "YES" : "NO"}, ` +
        `STABLE=${stablePasses}`
      );
      if (!closingMessageFound) {
        if (count > 0) {
          const oldestRenderedMessage =
            messageElements.first();

          await oldestRenderedMessage
            .scrollIntoViewIfNeeded()
            .catch(() => {});

          await oldestRenderedMessage
            .hover()
            .catch(() => {});
        } else {
          await container.hover().catch(() => {});
        }

        await page.mouse.wheel(0, -1800);
        await page.waitForTimeout(1500);
      }


      if (
        closingMessageFound &&
        stablePasses >= 2
      ) {
        finalAriaSnapshot =
          ariaSnapshot;

        break;
      }

      finalAriaSnapshot =
        ariaSnapshot;
    }

    if (!closingMessageFound) {
      throw new Error(
        "Closing message never appeared in the ARIA message source."
      );
    }

    if (stablePasses < 2) {
      throw new Error(
        "Facebook ARIA message source did not stabilize before processing."
      );
    }

    console.log(
      "\nARIA MESSAGE SOURCE STABLE"
    );

    console.log(
      "Final ARIA message elements:",
      finalAriaSnapshot.length
    );

    // ------------------------------------------
    // PARSE THE SAME VERIFIED SNAPSHOT
    // ------------------------------------------

    const messages =
      finalAriaSnapshot
        .map(parseMessageAria)
        .filter(Boolean);

    console.log(
      "Parsed messages:",
      messages.length
    );

    let closingMessageIndex = -1;

    for (
      let i = messages.length - 1;
      i >= 0;
      i--
    ) {
      const row = messages[i];

      if (
        row.sender.toLowerCase() ===
          "you" &&
        row.message.includes(
          closingMessageMarker
        ) &&
        row.message.includes(
          closingMessageConfirmation
        )
      ) {
        closingMessageIndex = i;
        break;
      }
    }

    if (closingMessageIndex === -1) {
      throw new Error(
        "Closing message existed in verified ARIA snapshot but could not be parsed."
      );
    }

    console.log(
      "Closing message parsed at index:",
      closingMessageIndex
    );

    // ------------------------------------------
    // ONLY MESSAGES AFTER CLOSING COUNT
    // ------------------------------------------

    const repliesAfterClosing =
      messages
        .slice(
          closingMessageIndex + 1
        )
        .filter((row) => {
          const sender =
            row.sender.toLowerCase();

          return (
            sender !== "you" &&
            sender !== "dealhaus"
          );
        });

    // ------------------------------------------
    // NO REPLY = CLEAN EXIT, ZERO WRITES
    // ------------------------------------------

    if (!repliesAfterClosing.length) {
      console.log(
        "\nNO NEW CLOSING REPLY"
      );

      console.log(
        `${buyerName} has not replied after the closing coordination message.`
      );

      console.log(
        "\nPROCESSOR COMPLETE"
      );

      console.log(
        "No Facebook messages sent."
      );

      console.log(
        "No DealHaus data changed."
      );

      console.log(
        "Seller was NOT contacted."
      );

      console.log(
        "Deal was NOT marked sold."
      );

      await context.close();
      context = null;

      return;
    }

    // ------------------------------------------
    // NEW BUYER REPLY
    // ------------------------------------------

    const newestReply =
      repliesAfterClosing[
        repliesAfterClosing.length - 1
      ];

    console.log(
      "\nNEW CLOSING REPLY DETECTED"
    );

    console.log(
      "Buyer:",
      newestReply.sender
    );

    console.log(
      "Message:",
      newestReply.message
    );

    const normalized =
      newestReply.message
        .trim()
        .toLowerCase();

    let classification = "other";

    if (
      /\b(pick\s*up|pickup|pick it up|come get it|come pick it up|i can pick it up|i'll pick it up|i will pick it up)\b/i.test(
        normalized
      )
    ) {
      classification = "pickup";
    } else if (
      /\b(assembly|assemble|assembled|delivery|deliver|delivered)\b/i.test(
        normalized
      )
    ) {
      classification =
        "assembly_or_delivery";
    }

    console.log(
      "Classification:",
      classification
    );

    // ------------------------------------------
    // SAFE DATABASE STATE
    // ------------------------------------------

    const actionablePreference =
      classification === "pickup" ||
      classification ===
        "assembly_or_delivery";

    const nextMeetupStatus =
      actionablePreference
        ? "buyer_preference_received"
        : "buyer_reply_needs_review";

    const previousNotes =
      String(tx.notes || "").trim();

    const buyerReplyNote =
      `Buyer closing reply: "${newestReply.message}"\n` +
      `Buyer preference classification: ${classification}\n` +
      (
        actionablePreference
          ? "Next step: seller coordination required."
          : "Next step: buyer reply requires review before seller coordination."
      );

    const nextNotes =
      previousNotes
        ? `${previousNotes}\n\n${buyerReplyNote}`
        : buyerReplyNote;

    const {
      data: updatedTransaction,
      error: updateError,
    } = await supabase
      .from("brokerage_transactions")
      .update({
        meetup_status:
          nextMeetupStatus,
        notes:
          nextNotes,
      })
      .eq("id", tx.id)
      .eq(
        "meetup_status",
        "buyer_coordination_started"
      )
      .select(
        "id,buyer_name,sale_price,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,notes"
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log(
      "\nBUYER CLOSING REPLY SAVED"
    );

    console.dir(
      updatedTransaction,
      { depth: null }
    );

    console.log(
      "\nPROCESSOR COMPLETE"
    );

    console.log(
      "No Facebook messages sent."
    );

    console.log(
      "Seller was NOT contacted."
    );

    console.log(
      "Deal was NOT marked sold."
    );

    await context.close();
    context = null;
  } finally {
    if (context) {
      await context
        .close()
        .catch(() => {});
    }
  }
})().catch((error) => {
  console.error(
    "\nCLOSING REPLY PROCESSOR FAILED:",
    error.message
  );

  process.exit(1);
});



