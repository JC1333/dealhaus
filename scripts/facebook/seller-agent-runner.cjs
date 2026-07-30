const { createClient } = require("@supabase/supabase-js");
const { spawn } = require("child_process");
const path = require("path");

const CHECK_INTERVAL_MS = 60 * 1000;
const RUN_ONCE = process.argv.includes("--once");

let running = false;

async function runSellerSweep() {
  if (running) {
    console.log(
      "Seller Agent sweep is already running. Skipping overlapping run."
    );
    return true;
  }

  running = true;
  let sweepFailed = false;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("\n======================================");
    console.log("DEALHAUS SELLER AGENT SWEEP");
    console.log(new Date().toLocaleString());
    console.log("======================================");

    const { data: leads, error } = await supabase
      .from("seller_leads")
      .select("id,item_title,platform,lead_source,marketplace_listing_url,outreach_status,status")
      .eq("outreach_status", "contacted")
.eq("status", "approved_for_outreach")
.not("lead_source", "ilike", "%test%")
.order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    if (!leads?.length) {
      console.log("No contacted sellers currently waiting.");
      return true;
    }

    console.log(
      `Contacted sellers waiting: ${leads.length}`
    );

    const facebookSellerAgentPath = path.join(
      process.cwd(),
      "scripts",
      "facebook",
      "seller-agent.cjs"
    );

    const offerUpSellerAgentPath = path.join(
      process.cwd(),
      "scripts",
      "offerup",
      "read-offerup-reply.cjs"
    );

    for (const lead of leads) {
      console.log("\n--------------------------------------");
      console.log("Checking seller:", lead.item_title);
      console.log("Lead ID:", lead.id);
      console.log("--------------------------------------");

      const platform = String(
        lead.platform || ""
      ).toLowerCase();

      const listingUrl = String(
        lead.marketplace_listing_url || ""
      ).toLowerCase();

      let sellerAgentPath = null;

      if (
        platform.includes("offerup") ||
        listingUrl.includes("offerup.com")
      ) {
        sellerAgentPath = offerUpSellerAgentPath;
        console.log("Platform route: OFFERUP");
      } else if (
        platform.includes("facebook") ||
        listingUrl.includes("facebook.com")
      ) {
        sellerAgentPath = facebookSellerAgentPath;
        console.log("Platform route: FACEBOOK");
      } else {
  console.error(
    `FAILED SAFE: Unsupported contacted seller platform: ${lead.platform || lead.lead_source || "unknown"}`
  );
  sweepFailed = true;
  continue;
}

      const childSucceeded = await new Promise((resolve) => {
        const child = spawn(
          process.execPath,
          [
            "--env-file=.env.local",
            sellerAgentPath,
            lead.id,
          ],
          {
            cwd: process.cwd(),
            stdio: "inherit",
          }
        );

        let processError = false;

        child.on("error", (error) => {
          processError = true;

          console.error(
            "SELLER AGENT PROCESS ERROR:",
            error.message
          );
        });

        child.on("exit", (code) => {
          console.log(
            `Seller Agent finished with exit code ${code}.`
          );

          resolve(
            !processError &&
            code === 0
          );
        });
      });

      if (!childSucceeded) {
        sweepFailed = true;

        console.error(
          `SELLER CHECK FAILED: ${lead.item_title}`
        );
      }
    }

    if (sweepFailed) {
      throw new Error(
        "One or more Seller Agent checks failed during this sweep."
      );
    }

    return true;
  } catch (error) {
    console.error(
      "\nSELLER AGENT SWEEP FAILED:",
      error.message
    );

    return false;
  } finally {
    running = false;
  }
}

console.log("\nDEALHAUS MULTI-PLATFORM SELLER AGENT RUNNER");
console.log("------------------------------------");
console.log(
  RUN_ONCE
    ? "Single seller sweep mode."
    : "Checking contacted sellers once every 60 seconds."
);
console.log("Press Ctrl+C to stop.");

if (RUN_ONCE) {
  runSellerSweep().then((success) => {
    if (success) {
      console.log("Seller Agent single sweep complete.");
      process.exit(0);
    }

    console.error("Seller Agent single sweep failed.");
    process.exit(1);
  });
} else {
  runSellerSweep();

  setInterval(() => {
    runSellerSweep();
  }, CHECK_INTERVAL_MS);
}
