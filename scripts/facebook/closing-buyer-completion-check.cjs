const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRANSACTION_ID = process.argv[2];

if (!TRANSACTION_ID) {
  console.error(
    "BUYER CLOSING SENDER FAILED: Transaction ID is required."
  );
  process.exit(1);
}

(async () => {
  console.log("\nDEALHAUS BUYER CLOSING SENDER");
  console.log("-----------------------------");

  // Load the exact transaction supplied by the runner.
  const { data: tx, error: txError } = await supabase
    .from("brokerage_transactions")
    .select("*")
    .eq("id", TRANSACTION_ID)
    .single();

  if (txError) throw txError;

  if (tx.transaction_status !== "open") {
    console.log(
      `SKIPPED: Transaction status is ${tx.transaction_status}.`
    );
    return;
  }

  if (tx.meetup_status !== "meetup_scheduled") {
    console.log(
      `SKIPPED: Meetup status is ${tx.meetup_status}.`
    );
    return;
  }

  if (!tx.meetup_scheduled_at) {
    throw new Error(
      "Scheduled meetup has no meetup_scheduled_at value."
    );
  }

  const scheduledMeetup = new Date(tx.meetup_scheduled_at);

  if (
    Number.isNaN(scheduledMeetup.getTime())
  ) {
    throw new Error(
      "meetup_scheduled_at is not a valid datetime."
    );
  }

  if (scheduledMeetup.getTime() > Date.now()) {
    console.log(
      `SKIPPED: Meetup is scheduled for ${scheduledMeetup.toLocaleString("en-US")}.`
    );
    console.log(
      "Completion confirmation will not be requested early."
    );
    return;
  }

  if (
    !tx.inventory_item_id ||
    !tx.negotiation_task_id ||
    !tx.buyer_outreach_task_id ||
    !tx.seller_lead_id
  ) {
    throw new Error(
      "Transaction is missing required closing links."
    );
  }

  // Verify the accepted negotiation.
  const { data: negotiation, error: negotiationError } =
    await supabase
      .from("negotiation_tasks")
      .select("*")
      .eq("id", tx.negotiation_task_id)
      .single();

  if (negotiationError) throw negotiationError;

  if (negotiation.negotiation_status !== "offer_accepted") {
    throw new Error(
      "Negotiation is not offer_accepted."
    );
  }

  const acceptedPrice = Number(
    negotiation.current_offer
  );

  if (
    !Number.isFinite(acceptedPrice) ||
    acceptedPrice <= 0
  ) {
    throw new Error(
      "Accepted negotiation does not contain a valid positive offer."
    );
  }

  if (Number(tx.sale_price) !== acceptedPrice) {
    throw new Error(
      "Accepted price does not match transaction."
    );
  }

  // Verify the linked buyer outreach task.
  const {
    data: buyerOutreach,
    error: buyerOutreachError,
  } = await supabase
    .from("buyer_outreach_tasks")
    .select("*")
    .eq("id", tx.buyer_outreach_task_id)
    .single();

  if (buyerOutreachError) {
    throw buyerOutreachError;
  }

  if (
    Number(buyerOutreach.inventory_item_id) !==
    Number(tx.inventory_item_id)
  ) {
    throw new Error(
      "Buyer outreach task does not belong to this inventory item."
    );
  }

  // Load the exact inventory item.
  const {
    data: inventory,
    error: inventoryError,
  } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", tx.inventory_item_id)
    .single();

  if (inventoryError) throw inventoryError;

  const buyerName = String(
    tx.buyer_name ||
    buyerOutreach.buyer_name ||
    ""
  ).trim();

  const itemTitle = String(
    inventory.title ||
    tx.item_title ||
    ""
  ).trim();

  if (!buyerName || !itemTitle) {
    throw new Error(
      "Buyer or inventory identity is missing."
    );
  }

  const message =
    `Hi ${buyerName} - just checking in. Did everything go through successfully with the ${itemTitle}? ` +
    `Please let me know if the transaction was completed, or if anything still needs to be worked out.`;
  let expectedConversation = null;

  console.log("Buyer:", buyerName);
  console.log(
    "Accepted price:",
    `$${acceptedPrice.toFixed(2)}`
  );
  console.log(
    "Looking for exact buyer + item:",
    buyerName,
    "|",
    itemTitle
  );

  const context =
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

  console.log(
    "\nOpening Facebook Messenger..."
  );

  await page.goto(
    "https://www.facebook.com/messages/",
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  await page.waitForTimeout(5000);

  // Marketplace navigation is mandatory.
  // Never search the general Messenger list.
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

      await marketplace.click({
        timeout: 15000,
        force: true,
      });

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

  // Locate exact buyer + exact item.
  let exactRow = null;

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
        .replace(/^Group chat:\s*/i, "")
        .trim();

      const normalizedTitle =
        title.toLowerCase();

      const normalizedBuyer =
        buyerName.toLowerCase();

      const normalizedItem =
        itemTitle.toLowerCase();

      if (
        normalizedTitle.includes(
          normalizedBuyer
        ) &&
        normalizedTitle.includes(
          normalizedItem
        )
      ) {
        exactRow = row;
        expectedConversation = title;

        console.log(
          "FACEBOOK EXACT CONVERSATION:",
          expectedConversation
        );

        break;
      }
    }

    if (exactRow) break;

    console.log(
      `WAITING FOR EXACT BUYER ROW ${attempt}/30`
    );

    await page.waitForTimeout(1000);
  }

  if (!exactRow) {
    throw new Error(
      `Exact Marketplace conversation was not found for ${buyerName} and "${itemTitle}".`
    );
  }

  console.log(
    "EXACT BUYER CONVERSATION FOUND"
  );

  await exactRow.click({
    timeout: 15000,
    force: true,
  });

  let container = null;

  for (
    let attempt = 1;
    attempt <= 20;
    attempt++
  ) {
    await page.waitForTimeout(1000);

    container = page.locator(
      `[aria-label="Messages in conversation titled ${expectedConversation}"]`
    );

    if (
      await container
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }

    console.log(
      `WAITING FOR EXACT BUYER THREAD ${attempt}/20`
    );
  }

  if (
    !container ||
    !(await container
      .isVisible()
      .catch(() => false))
  ) {
    throw new Error(
      "Exact buyer conversation could not be verified."
    );
  }

  console.log(
    "VERIFIED: EXACT BUYER CONVERSATION IS ACTIVE"
  );

  const existingBody =
    await container
      .innerText()
      .catch(() => "");

  /*
   * Recovery-safe duplicate handling:
   *
   * If Facebook already contains the exact closing
   * message, do NOT resend it. Instead repair the
   * DealHaus transaction state.
   */
  if (existingBody.includes(message)) {
    console.log(
      "\nCLOSING MESSAGE ALREADY EXISTS IN FACEBOOK"
    );

    console.log(
      "Duplicate Facebook send blocked."
    );

    const {
      data: repaired,
      error: repairError,
    } = await supabase
      .from("brokerage_transactions")
      .update({
        meetup_status:
          "buyer_completion_confirmation_requested",
        notes:
          `Buyer closing coordination started with ${buyerName}. ` +
          `Accepted price: $${acceptedPrice.toFixed(2)}. ` +
          `Awaiting buyer receiving preference and timing details.`,
      })
      .eq("id", tx.id)
      .select(
        "id,buyer_name,sale_price,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,notes"
      )
      .single();

    if (repairError) {
      throw repairError;
    }

    console.log(
      "\nDEALHAUS STATE SYNCHRONIZED FROM VERIFIED FACEBOOK MESSAGE"
    );

    console.dir(repaired, {
      depth: null,
    });

    console.log(
      "\nBUYER CLOSING COORDINATION ALREADY STARTED"
    );
    console.log(
      "Seller was NOT contacted."
    );
    console.log(
      "Deal was NOT marked sold."
    );

    await context.close();
    return;
  }

  const composer = page
    .locator(
      `[aria-label="Write to ${expectedConversation}"]`
    )
    .last();

  if (
    !(await composer
      .isVisible()
      .catch(() => false))
  ) {
    throw new Error(
      "Exact buyer message composer unavailable."
    );
  }

  await composer.click();

  await page.keyboard.insertText(
    message
  );

  console.log(
    "\nSENDING BUYER CLOSING MESSAGE:"
  );

  console.log(message);

  await composer.press("Enter");

  // Verify the exact outbound message in Facebook
  // before changing DealHaus state.
  let verified = false;

  for (
    let attempt = 1;
    attempt <= 15;
    attempt++
  ) {
    await page.waitForTimeout(1000);

    const body =
      await container
        .innerText()
        .catch(() => "");

    if (body.includes(message)) {
      verified = true;
      break;
    }

    console.log(
      `WAITING FOR SEND VERIFICATION ${attempt}/15`
    );
  }

  if (!verified) {
    throw new Error(
      "Closing message was not verified in Facebook. DealHaus state was not advanced."
    );
  }

  console.log(
    "\nVERIFIED: CLOSING MESSAGE EXISTS IN FACEBOOK"
  );

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("brokerage_transactions")
    .update({
      meetup_status:
        "buyer_completion_confirmation_requested",
      notes:
        `Buyer closing coordination started with ${buyerName}. ` +
        `Accepted price: $${acceptedPrice.toFixed(2)}. ` +
        `Awaiting buyer receiving preference and timing details.`,
    })
    .eq("id", tx.id)
    .select(
      "id,buyer_name,sale_price,meetup_status,buyer_confirmed,seller_confirmed,transaction_status,notes"
    )
    .single();

  if (updateError) {
    throw updateError;
  }

  console.log(
    "\nTRANSACTION UPDATED"
  );

  console.dir(updated, {
    depth: null,
  });

  console.log(
    "\nBUYER CLOSING COORDINATION STARTED"
  );

  console.log(
    "Seller was NOT contacted."
  );

  console.log(
    "Deal was NOT marked sold."
  );

  await context.close();
})().catch((error) => {
  console.error(
    "\nBUYER CLOSING SENDER FAILED:",
    error.message
  );

  process.exit(1);
});


