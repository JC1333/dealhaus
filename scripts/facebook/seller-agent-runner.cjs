const { createClient } = require("@supabase/supabase-js");
const { spawnSync } = require("child_process");
const path = require("path");

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("\nDEALHAUS FACEBOOK SELLER AGENT RUNNER");
  console.log("------------------------------------");
  console.log("Looking for sellers awaiting Facebook responses...\n");

  const { data: leads, error } = await supabase
    .from("seller_leads")
    .select("id,item_title,outreach_status,status")
    .eq("outreach_status", "contacted")
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (!leads?.length) {
    console.log("NO CONTACTED SELLERS CURRENTLY WAITING");
    console.log("Nothing to process.");
    return;
  }

  console.log(`FOUND ${leads.length} CONTACTED SELLER(S)\n`);

  const sellerAgentPath = path.join(
    process.cwd(),
    "scripts",
    "facebook",
    "seller-agent.cjs"
  );

  let checked = 0;
  let succeeded = 0;
  let failed = 0;

  for (const lead of leads) {
    checked++;

    console.log("\n====================================");
    console.log(`SELLER ${checked}/${leads.length}`);
    console.log("Item:", lead.item_title);
    console.log("Lead ID:", lead.id);
    console.log("====================================");

    const result = spawnSync(
      process.execPath,
      [sellerAgentPath, lead.id],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      }
    );

    if (result.status === 0) {
      succeeded++;
      console.log("\nSELLER CHECK COMPLETED");
    } else {
      failed++;
      console.error(
        `\nSELLER CHECK FAILED — continuing to next lead`
      );
    }
  }

  console.log("\n====================================");
  console.log("SELLER AGENT RUN COMPLETE");
  console.log("====================================");
  console.log("Contacted sellers found:", leads.length);
  console.log("Checked:", checked);
  console.log("Completed:", succeeded);
  console.log("Failed:", failed);

  if (failed > 0) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error("\nSELLER AGENT RUNNER FAILED:", error.message);
  process.exit(1);
});