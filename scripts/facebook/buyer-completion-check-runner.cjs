
const { createClient } = require("@supabase/supabase-js");
const { spawnSync } = require("child_process");
const path = require("path");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runClosingStartRunner() {
  console.log("\nDEALHAUS BUYER COMPLETION CHECK RUNNER");
  console.log("-----------------------------");
  console.log(
    "Finding completed-time meetups ready for buyer confirmation."
  );

  const {
    data: transactions,
    error: transactionError,
  } = await supabase
    .from("brokerage_transactions")
    .select(
      "id,inventory_item_id,item_title,buyer_name,sale_price,meetup_status,transaction_status,negotiation_task_id,buyer_outreach_task_id,seller_lead_id"
    )
    .eq("meetup_status", "meetup_scheduled")
    .eq("transaction_status", "open")
    .not("negotiation_task_id", "is", null)
    .not("buyer_outreach_task_id", "is", null)
    .not("seller_lead_id", "is", null)
    .order("updated_at", {
      ascending: true,
    });

  if (transactionError) {
    throw transactionError;
  }

  if (!transactions?.length) {
    console.log(
      "\nNo transactions are currently waiting to start buyer closing coordination."
    );

    console.log(
      "\nBUYER COMPLETION CHECK RUNNER COMPLETE"
    );

    return;
  }

  console.log(
    `Transactions ready to start closing: ${transactions.length}`
  );

    const facebookSenderPath = path.join(
    process.cwd(),
    "scripts",
    "facebook",
    "closing-buyer-completion-check.cjs"
  );

  const websiteEmailSenderPath = path.join(
    process.cwd(),
    "scripts",
    "facebook",
    "closing-buyer-completion-email.cjs"
  );

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (const transaction of transactions) {
    console.log(
      "\n======================================"
    );

    console.log(
      "STARTING BUYER CLOSING COORDINATION"
    );

    console.log(
      "Item:",
      transaction.item_title
    );

    console.log(
      "Buyer:",
      transaction.buyer_name
    );

    console.log(
      "Sale price:",
      `$${Number(
        transaction.sale_price || 0
      ).toFixed(2)}`
    );

    console.log(
      "Transaction:",
      transaction.id
    );

    console.log(
      "======================================"
    );

    if (
      !transaction.id ||
      !transaction.inventory_item_id ||
      !transaction.buyer_name ||
      !transaction.negotiation_task_id ||
      !transaction.buyer_outreach_task_id ||
      !transaction.seller_lead_id
    ) {
      console.log(
        "SKIPPED: Transaction is missing required verified closing links."
      );

      skipped++;
      continue;
    }

        const {
      data: buyerTask,
      error: buyerTaskError,
    } = await supabase
      .from("buyer_outreach_tasks")
      .select("buyer_platform")
      .eq(
        "id",
        transaction.buyer_outreach_task_id
      )
      .single();

    if (buyerTaskError) {
      throw buyerTaskError;
    }

    const senderPath =
      buyerTask?.buyer_platform === "DealHaus Website"
        ? websiteEmailSenderPath
        : facebookSenderPath;

    console.log(
      "Completion channel:",
      buyerTask?.buyer_platform === "DealHaus Website"
        ? "DealHaus Website Email"
        : "Facebook Marketplace"
    );

    const result = spawnSync(
      process.execPath,
      [
        "--env-file=.env.local",
        senderPath,
        transaction.id,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      }
    );

    if (result.error) {
      console.error(
        "\nBUYER CLOSING SENDER PROCESS ERROR:",
        result.error.message
      );

      failed++;
      continue;
    }

    if (result.status !== 0) {
      console.error(
        `\nBUYER CLOSING SENDER FAILED WITH EXIT CODE ${result.status}`
      );

      failed++;
      continue;
    }

    successful++;

    console.log(
      "\nTRANSACTION BUYER CLOSING START CHECK COMPLETE"
    );
  }

  console.log(
    "\n======================================"
  );

  console.log(
    "BUYER COMPLETION CHECK RUNNER COMPLETE"
  );

  console.log(
    "Successful:",
    successful
  );

  console.log(
    "Skipped:",
    skipped
  );

  console.log(
    "Failed:",
    failed
  );

  console.log(
    "======================================"
  );
}

runClosingStartRunner().catch((error) => {
  console.error(
    "\nCLOSING START RUNNER FAILED:",
    error.message
  );

  process.exit(1);
});


