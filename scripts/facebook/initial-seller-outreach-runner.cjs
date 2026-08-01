const { createClient } = require("@supabase/supabase-js");
const { spawnSync } = require("child_process");
const path = require("path");

process.loadEnvFile(
  path.resolve(process.cwd(), ".env.local")
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const baseUrl =
  process.env.DEALHAUS_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

const OUTREACH_BATCH_LIMIT = Math.max(
  1,
  Number(
    process.env.OUTREACH_BATCH_LIMIT || 25
  )
);

const ONLY_SELLER_LEAD_ID =
  String(
    process.env.ONLY_SELLER_LEAD_ID || ""
  ).trim();

function normalizePlatform(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function senderForPlatform(platform) {
  const normalized = normalizePlatform(platform);

  if (
    normalized.includes("facebook")
  ) {
    return path.join(
      process.cwd(),
      "scripts",
      "facebook",
      "send-marketplace-message.cjs"
    );
  }

  if (normalized.includes("offerup")) {
    return path.join(
      process.cwd(),
      "scripts",
      "offerup",
      "send-offerup-message.cjs"
    );
  }

  if (normalized.includes("craigslist")) {
    return path.join(
      process.cwd(),
      "scripts",
      "craigslist",
      "send-craigslist-outreach.cjs"
    );
  }

  return null;
}

async function approveQualifiedLeads() {
  let leadQuery = supabase
    .from("seller_leads")
    .select(
      "id,item_title,platform,marketplace_source,ai_score,acquisition_score,status,outreach_status,approval_status"
    )
    .eq("status", "new")
    .eq("outreach_status", "not_started")
    .eq("approval_status", "not_approved")
    .gte("acquisition_score", 65)
    .order("created_at", {
      ascending: true,
    })
    .limit(OUTREACH_BATCH_LIMIT);

  if (ONLY_SELLER_LEAD_ID) {
    leadQuery = leadQuery.eq(
      "id",
      ONLY_SELLER_LEAD_ID
    );
  }

  const { data: leads, error } =
    await leadQuery;

  if (error) {
    throw error;
  }

  console.log(
    `AI-qualified seller leads awaiting outreach preparation: ${leads?.length || 0}`
  );

  for (const lead of leads || []) {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/seller-lead-status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: lead.id,
          status: "approved_for_outreach",
        }),
        signal: AbortSignal.timeout(120000),
      }
    );

    const body = await response.text();

    if (!response.ok) {
      console.error(
        `OUTREACH PREPARATION FAILED FOR ${lead.id}: ${response.status} ${body}`
      );
      continue;
    }

    console.log(
      `OUTREACH PREPARED: ${lead.item_title} (${lead.id})`
    );
  }
}

async function sendPendingOutreach() {
  let taskQuery = supabase
    .from("outreach_tasks")
    .select(
      "id,seller_lead_id,item_title,platform,send_status,attempt_count"
    )
    .eq("send_status", "pending")
    .order("created_at", {
      ascending: true,
    })
    .limit(OUTREACH_BATCH_LIMIT);

  if (ONLY_SELLER_LEAD_ID) {
    taskQuery = taskQuery.eq(
      "seller_lead_id",
      ONLY_SELLER_LEAD_ID
    );
  }

  const { data: tasks, error } =
    await taskQuery;

  if (error) {
    throw error;
  }

  console.log(
    `Pending seller outreach tasks ready to send: ${tasks?.length || 0}`
  );

  for (const task of tasks || []) {
    if (!task.seller_lead_id) {
      console.error(
        `SKIPPED OUTREACH TASK ${task.id}: missing seller_lead_id`
      );
      continue;
    }

    const senderPath =
      senderForPlatform(task.platform);

    if (!senderPath) {
      console.error(
        `SKIPPED OUTREACH TASK ${task.id}: unsupported platform "${task.platform || "missing"}"`
      );
      continue;
    }

    const { data: claimedTask, error: claimError } =
      await supabase
        .from("outreach_tasks")
        .update({
          send_status: "sending",
        })
        .eq("id", task.id)
        .eq("send_status", "pending")
        .select("id")
        .maybeSingle();

    if (claimError) {
      console.error(
        `OUTREACH CLAIM FAILED ${task.id}: ${claimError.message}`
      );
      continue;
    }

    if (!claimedTask) {
      console.log(
        `OUTREACH TASK ALREADY CLAIMED OR ADVANCED: ${task.id}`
      );
      continue;
    }

    console.log("\n======================================");
    console.log("STARTING INITIAL SELLER OUTREACH");
    console.log("Item:", task.item_title);
    console.log("Platform:", task.platform);
    console.log("Seller lead:", task.seller_lead_id);
    console.log("======================================");

    const result = spawnSync(
      process.execPath,
      [
        "--env-file=.env.local",
        senderPath,
        task.seller_lead_id,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      }
    );

    if (
      result.error ||
      result.status !== 0
    ) {
      const { error: rollbackError } =
        await supabase
          .from("outreach_tasks")
          .update({
            send_status: "pending",
          })
          .eq("id", task.id)
          .eq("send_status", "sending");

      if (rollbackError) {
        console.error(
          `OUTREACH ROLLBACK FAILED ${task.id}: ${rollbackError.message}`
        );
      }

      console.error(
        `INITIAL SELLER OUTREACH FAILED: ${
          result.error?.message ||
          `exit code ${result.status}`
        }`
      );

      continue;
    }

    console.log(
      "INITIAL SELLER OUTREACH COMPLETE"
    );
  }
}

(async () => {
  console.log("\nDEALHAUS INITIAL SELLER OUTREACH RUNNER");
  console.log("---------------------------------------");

  await approveQualifiedLeads();
  await sendPendingOutreach();

  console.log(
    "\nINITIAL SELLER OUTREACH RUNNER COMPLETE"
  );
})().catch((error) => {
  console.error(
    "\nINITIAL SELLER OUTREACH RUNNER FAILED:",
    error.message
  );
  process.exit(1);
});