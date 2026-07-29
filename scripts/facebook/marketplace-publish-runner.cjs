const { createClient } = require("@supabase/supabase-js");
const { spawnSync } = require("child_process");
const path = require("path");

const ONLY_INVENTORY_ID = process.argv[2]
  ? Number(process.argv[2])
  : null;

const DRY_RUN =
  String(process.env.DEALHAUS_DRY_RUN || "").toLowerCase() === "true";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sellerIsAuthorized(inventoryItemId) {
  const { data: relistTask, error: relistError } = await supabase
    .from("ai_relist_tasks")
    .select("listing_prep_task_id")
    .eq("inventory_item_id", inventoryItemId)
    .limit(1)
    .maybeSingle();

  if (relistError) throw relistError;
  if (!relistTask?.listing_prep_task_id) {
    return false;
  }

  const { data: prepTask, error: prepError } = await supabase
    .from("listing_prep_tasks")
    .select("seller_lead_id")
    .eq("id", relistTask.listing_prep_task_id)
    .maybeSingle();

  if (prepError) throw prepError;
  if (!prepTask?.seller_lead_id) {
    return false;
  }

  const { data: seller, error: sellerError } = await supabase
    .from("seller_leads")
    .select("status,approval_status,agreement_accepted")
    .eq("id", prepTask.seller_lead_id)
    .maybeSingle();

  if (sellerError) throw sellerError;

  return (
    seller?.status === "sent_to_relist_queue" &&
    seller?.approval_status === "approved" &&
    seller?.agreement_accepted === true
  );
}

(async () => {
  console.log("\nDEALHAUS MARKETPLACE PUBLISH RUNNER");
  console.log("----------------------------------");

  let query = supabase
    .from("marketplace_publish_tasks")
    .select("id,inventory_item_id,item_title,publish_status")
    .eq("publish_status", "ready_to_publish")
    .order("created_at", { ascending: true });

  if (ONLY_INVENTORY_ID) {
    query = query.eq("inventory_item_id", ONLY_INVENTORY_ID);
  }

  const { data: tasks, error } = await query;

  if (error) throw error;

  if (!tasks?.length) {
    console.log("No ready-to-publish marketplace tasks found.");
    return;
  }

  for (const task of tasks) {
    if (!task.inventory_item_id) {
      console.log(
        `SKIPPED PUBLISH TASK ${task.id}: missing inventory_item_id`
      );
      continue;
    }

    const authorized = await sellerIsAuthorized(
      task.inventory_item_id
    );

    if (!authorized) {
      console.log(
        `SKIPPED INVENTORY ${task.inventory_item_id}: seller is not currently authorized for publishing`
      );
      continue;
    }

    console.log(
      `\nPUBLISHING INVENTORY ${task.inventory_item_id}: ${task.item_title || ""}`
    );

    const publisherPath = path.join(
      process.cwd(),
      "scripts",
      "facebook",
      "publish-marketplace-listing.cjs"
    );

    const result = spawnSync(
      process.execPath,
      [
        "--env-file=.env.local",
        publisherPath,
        String(task.inventory_item_id),
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DEALHAUS_DRY_RUN: DRY_RUN ? "true" : "",
        },
        stdio: "inherit",
      }
    );

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(
        `Facebook publisher failed for inventory ${task.inventory_item_id} with exit code ${result.status}`
      );
    }

    console.log(
      DRY_RUN
        ? `DRY RUN VERIFIED FOR INVENTORY ${task.inventory_item_id}`
        : `FACEBOOK PUBLISH PROCESS COMPLETED FOR INVENTORY ${task.inventory_item_id}`
    );
  }
})().catch((error) => {
  console.error(
    "\nMARKETPLACE PUBLISH RUNNER FAILED:",
    error.message
  );
  process.exit(1);
});