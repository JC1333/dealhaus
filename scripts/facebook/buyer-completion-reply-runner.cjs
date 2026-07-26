const { createClient } = require("@supabase/supabase-js");
const { spawnSync } = require("child_process");
const path = require("path");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runClosingReplyRunner() {
  console.log("\nDEALHAUS CLOSING REPLY RUNNER");
  console.log("-----------------------------");
  console.log(
    "Finding open deals waiting for buyer closing replies."
  );

  // Only transactions that have already started
  // buyer closing coordination belong in this stage.
  const {
    data: transactions,
    error: transactionError,
  } = await supabase
    .from("brokerage_transactions")
    .select(
      "id,inventory_item_id,item_title,buyer_name,sale_price,meetup_status,transaction_status"
    )
    .eq(
      "meetup_status",
      "completion_confirmations_requested"
    )
    .eq(
      "transaction_status",
      "open"
    )
    .order("updated_at", {
      ascending: true,
    });

  if (transactionError) {
    throw transactionError;
  }

  if (!transactions?.length) {
    console.log(
      "\nNo buyer closing replies are currently waiting."
    );

    console.log(
      "\nCLOSING REPLY RUNNER COMPLETE"
    );

    return;
  }

  console.log(
    `Transactions waiting for buyer replies: ${transactions.length}`
  );

  const processorPath = path.join(
    process.cwd(),
    "scripts",
    "facebook",
    "closing-buyer-completion-reply-processor.cjs"
  );

  let successful = 0;
  let failed = 0;

  for (const transaction of transactions) {
    console.log(
      "\n======================================"
    );

    console.log(
      "CHECKING BUYER CLOSING REPLY"
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
      !transaction.buyer_name
    ) {
      console.log(
        "SKIPPED: Transaction is missing required closing data."
      );

      failed++;
      continue;
    }

    const result = spawnSync(
      process.execPath,
      [
        "--env-file=.env.local",
        processorPath,
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
        "\nCLOSING REPLY PROCESSOR ERROR:",
        result.error.message
      );

      failed++;
      continue;
    }

    if (result.status !== 0) {
      console.error(
        `\nCLOSING REPLY PROCESSOR FAILED WITH EXIT CODE ${result.status}`
      );

      failed++;
      continue;
    }

    successful++;

    console.log(
      "\nTRANSACTION CLOSING REPLY CHECK COMPLETE"
    );
  }

  console.log(
    "\n======================================"
  );

  console.log(
    "CLOSING REPLY RUNNER COMPLETE"
  );

  console.log(
    "Successful checks:",
    successful
  );

  console.log(
    "Failed checks:",
    failed
  );

  console.log(
    "======================================"
  );

  // Do not fail the entire runner merely because
  // one individual transaction had a Facebook issue.
  // Each transaction is isolated so other deals can
  // still be checked.
}

runClosingReplyRunner().catch((error) => {
  console.error(
    "\nCLOSING REPLY RUNNER FAILED:",
    error.message
  );

  process.exit(1);
});


