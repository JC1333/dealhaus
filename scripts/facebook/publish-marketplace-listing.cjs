const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const INVENTORY_ID = Number(process.argv[2]);

if (!INVENTORY_ID) {
  console.error(
    "Usage: node --env-file=.env.local scripts\\facebook\\publish-marketplace-listing.cjs <inventory_id>"
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;

    const request = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();

          return downloadFile(
            new URL(response.headers.location, url).href,
            destination
          )
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `Photo download failed with status ${response.statusCode}`
            )
          );
          return;
        }

        const file = fs.createWriteStream(destination);

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(destination);
        });

        file.on("error", reject);
      }
    );

    request.on("error", reject);
  });
}

(async () => {
  console.log("\nDEALHAUS FACEBOOK MARKETPLACE PUBLISHER");
  console.log("--------------------------------------");

  const { data: item, error } = await supabase
    .from("inventory")
    .select(
      "id,title,description,price,status,condition,category,seller_city,seller_state,images"
    )
    .eq("id", INVENTORY_ID)
    .single();

  if (error) throw error;
  if (!item) throw new Error("Inventory item not found");

  if (item.status !== "active") {
    throw new Error(
      `Inventory item is not active. Current status: ${item.status}`
    );
  }

  console.log("Inventory ID:", item.id);
  console.log("Title:", item.title);
  console.log("Price:", `$${item.price}`);
  console.log(
    "Location:",
    `${item.seller_city || ""}, ${item.seller_state || ""}`
  );
  console.log(
    "Photos:",
    Array.isArray(item.images) ? item.images.length : 0
  );

  const tempDir = path.join(
    process.cwd(),
    ".dealhaus",
    "facebook-publish",
    String(item.id)
  );

  fs.mkdirSync(tempDir, { recursive: true });

  const photoPaths = [];

  if (Array.isArray(item.images)) {
    for (let i = 0; i < item.images.length; i++) {
      const url = item.images[i];

      if (!url) continue;

      const destination = path.join(
        tempDir,
        `photo-${i + 1}.jpg`
      );

      console.log(`Downloading photo ${i + 1}/${item.images.length}...`);

      try {
        await downloadFile(url, destination);
        photoPaths.push(destination);
      } catch (photoError) {
        console.log(
          `Photo ${i + 1} download warning:`,
          photoError.message
        );
      }
    }
  }

  console.log("Downloaded photos:", photoPaths.length);

  const profileDir = path.join(
    process.cwd(),
    ".dealhaus-facebook-profile"
  );

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: "chrome",
    viewport: null,
    args: ["--start-maximized"],
  });

  const pages = context.pages();
  const page = pages[0] || (await context.newPage());

  console.log("\nOpening Facebook Marketplace listing creator...");

  try {
    await page.goto(
      "https://www.facebook.com/marketplace/create/item",
      {
        waitUntil: "commit",
        timeout: 30000,
      }
    );
  } catch (navigationError) {
    console.log(
      "Facebook navigation warning:",
      navigationError.message
    );
  }

  await page.waitForTimeout(7000);

  console.log("\nFACEBOOK CREATE LISTING PAGE OPENED");
  console.log("Current URL:", page.url());

  let bodyText = "";

  try {
    bodyText = await page.locator("body").innerText({
      timeout: 15000,
    });
  } catch (bodyError) {
    console.log(
      "Facebook page inspection warning:",
      bodyError.message
    );
  }

  console.log("\nPAGE PREVIEW:");
console.log(bodyText.slice(0, 4000));

const fileInputs = page.locator('input[type="file"]');

if (photoPaths.length > 0 && (await fileInputs.count()) > 0) {
  await fileInputs.first().setInputFiles(photoPaths);
  console.log(`Uploaded ${photoPaths.length} photo(s).`);
}

const textInputs = page.locator('input[type="text"]');

if ((await textInputs.count()) < 2) {
  throw new Error("Facebook title/price fields were not found");
}

const titleInput = textInputs.nth(0);
const priceInput = textInputs.nth(1);

await titleInput.fill(item.title);
await priceInput.fill(String(item.price));

const descriptionBox = page.locator("textarea").first();

await descriptionBox.fill(item.description || "");

console.log("Title filled:", await titleInput.inputValue());
console.log("Price filled:", await priceInput.inputValue());
console.log(
  "Description filled:",
  (await descriptionBox.inputValue()).slice(0, 200)
);

const combos = page.locator('[role="combobox"]');

if ((await combos.count()) < 3) {
  throw new Error("Facebook Category/Condition controls were not found");
}

// Category
await combos.nth(1).click();
await page.waitForTimeout(1000);

const furnitureOption = page.getByText("Furniture", {
  exact: true,
}).last();

await furnitureOption.click({ timeout: 10000 });

console.log("Category selected: Furniture");

await page.waitForTimeout(1000);

// Condition
const refreshedCombos = page.locator('[role="combobox"]');

await refreshedCombos.nth(2).click();
await page.waitForTimeout(1000);

const newCondition = page.getByText("New", {
  exact: true,
}).last();

await newCondition.click({ timeout: 10000 });

console.log("Condition selected: New");

console.log("\nFULL FORM FILL COMPLETE");
console.log("Photos/title/price/category/condition/description entered.");

const nextButton = page.getByText("Next", {
  exact: true,
}).last();

await nextButton.click({ timeout: 15000 });

console.log("Clicked Next.");

await page.waitForTimeout(5000);

const finalBody = await page.locator("body").innerText();

console.log("\n--- DELIVERY METHOD SCREEN ---\n");
console.log(finalBody.slice(0, 8000));

const deliveryNextButton = page.getByText("Next", {
  exact: true,
}).last();

await deliveryNextButton.click({ timeout: 15000 });

console.log("Clicked Delivery Method Next.");

await page.waitForTimeout(5000);

const publishBody = await page.locator("body").innerText();

console.log("\n--- TRUE FINAL PUBLISH SCREEN ---\n");
console.log(publishBody.slice(0, 10000));

console.log("\nREADY TO PUBLISH REAL FACEBOOK LISTING");

const publishButton = page.getByText("Publish", {
  exact: true,
}).last();

await publishButton.click({ timeout: 15000 });

console.log("Clicked Publish.");

await page.waitForTimeout(10000);

console.log("\nAFTER PUBLISH URL:");
console.log(page.url());

let afterPublishBody = "";

try {
  afterPublishBody = await page.locator("body").innerText({
    timeout: 15000,
  });
} catch (error) {
  console.log(
    "Post-publish page inspection warning:",
    error.message
  );
}

console.log("\n--- AFTER PUBLISH PAGE ---\n");
console.log(afterPublishBody.slice(0, 10000));

console.log("\nREAL PUBLISH ACTION COMPLETE");
console.log(
  "DealHaus database has NOT been marked published yet. External verification comes next."
);

await new Promise(() => {});
})().catch((error) => {
  console.error("\nFACEBOOK PUBLISHER FAILED:", error.message);
  process.exit(1);
});