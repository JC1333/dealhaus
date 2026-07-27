const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://dealhaus.us");

(async () => {
  console.log("\nDEALHAUS REVENUE WORKFLOW RUNNER");
  console.log("--------------------------------");

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/run-revenue-workflow`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error ||
        `Revenue workflow request failed with status ${response.status}.`
    );
  }

  console.log("Revenue workflow result:");
  console.dir(result, { depth: null });
})().catch((error) => {
  console.error(
    "\nREVENUE WORKFLOW RUNNER FAILED:",
    error.message
  );
  process.exit(1);
});
