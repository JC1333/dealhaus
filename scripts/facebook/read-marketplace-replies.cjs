const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const LEAD_ID = process.argv[2];

if (!LEAD_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\facebook\\read-marketplace-replies.cjs <seller_lead_id>"
  );
  process.exit(1);
}

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: lead, error } = await supabase
    .from("seller_leads")
    .select("id,item_title,outreach_message,outreach_status")
    .eq("id", LEAD_ID)
    .single();

  if (error) throw error;
  if (!lead) throw new Error("Seller lead not found");

  console.log("WATCHING LEAD:");
  console.log(lead.item_title);

  const profileDir = path.join(
    process.cwd(),
    ".dealhaus-facebook-profile"
  );

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: null,
    args: ["--start-maximized"],
  });

  const page = context.pages()[0] || (await context.newPage());

  await page.goto("https://www.facebook.com/messages/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  console.log("Waiting for Marketplace conversations...");

  let body = "";

  for (let attempt = 1; attempt <= 30; attempt++) {
    await page.waitForTimeout(2000);

    body = await page.locator("body").innerText();

    if (body.includes(lead.item_title)) {
      console.log("MARKETPLACE THREAD FOUND");
      break;
    }

    const marketplace = page
      .getByText("Marketplace", { exact: true })
      .first();

    if (await marketplace.isVisible().catch(() => false)) {
      await marketplace.click().catch(() => {});
    }

    console.log(`WAITING ${attempt}/30`);
  }

  if (!body.includes(lead.item_title)) {
    throw new Error(
      `Marketplace thread for "${lead.item_title}" did not render`
    );
  }

  const thread = page
    .getByText(new RegExp(lead.item_title, "i"))
    .first();

  await thread.click({ timeout: 15000 });
  await page.waitForTimeout(3000);

  console.log("SELLER THREAD OPEN");
  console.log("Watching for a new seller reply...");
  console.log("NO AUTOMATIC RESPONSE WILL BE SENT.");

  let lastBody = await page.locator("body").innerText();

  while (true) {
    await page.waitForTimeout(5000);

    const currentBody = await page.locator("body").innerText();

    if (currentBody === lastBody) {
      continue;
    }

    console.log("\nTHREAD CHANGED");

    const lines = currentBody
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    console.log(
      lines.slice(Math.max(0, lines.length - 50)).join("\n")
    );

    lastBody = currentBody;
  }
})().catch((error) => {
  console.error("REPLY WATCHER FAILED:", error.message);
  process.exit(1);
});