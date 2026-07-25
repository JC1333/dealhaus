const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const profileDir = path.join(process.cwd(), ".dealhaus-facebook-profile");

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 1400, height: 900 },
  });

  const pages = context.pages();
  const page = pages[0] || await context.newPage();

  await page.goto("https://www.facebook.com/marketplace/", {
    waitUntil: "domcontentloaded",
  });

  console.log("DealHaus Facebook browser opened.");
  console.log("Log into Facebook normally if requested.");
  console.log("When Marketplace is fully accessible, close the browser window.");
})();
