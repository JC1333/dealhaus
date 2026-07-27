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

  console.log("\nDEALHAUS OFFERUP SESSION SETUP");
  console.log("------------------------------");
  console.log(
    "Log into OfferUp normally in the browser."
  );
  console.log(
    "When your OfferUp account and listings/messages are accessible, close the browser."
  );

  await page.goto("https://offerup.com/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await new Promise((resolve) => {
    context.on("close", resolve);
  });
})().catch((error) => {
  console.error(
    "\nOFFERUP SESSION SETUP FAILED:",
    error.message
  );
  process.exit(1);
});
