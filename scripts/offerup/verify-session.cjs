const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const profileDir = path.join(
    process.cwd(),
    ".dealhaus-offerup-profile"
  );

  const context =
    await chromium.launchPersistentContext(
      profileDir,
      {
        headless: false,
        viewport: null,
        args: ["--start-maximized"],
      }
    );

  const page =
    context.pages()[0] ||
    (await context.newPage());

  await page.goto("https://offerup.com/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  console.log("\nOFFERUP SESSION VERIFICATION");
  console.log("----------------------------");
  console.log("URL:", page.url());
  console.log("Title:", await page.title());

  console.log(
    "Saved OfferUp session reopened successfully."
  );

  await context.close();
})().catch((error) => {
  console.error(
    "\nOFFERUP SESSION VERIFICATION FAILED:",
    error.message
  );
  process.exit(1);
});
