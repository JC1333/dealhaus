const { spawnSync } = require("child_process");
const path = require("path");

process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const CHECK_INTERVAL_MS = 60 * 1000;

const ACQUISITION_INTERVAL_MS =
  Number(
    process.env.ACQUISITION_INTERVAL_MS ||
      24 * 60 * 60 * 1000
  );

let lastAcquisitionRunAt = 0;


async function runAcquisitionAgent() {
  const baseUrl =
    process.env.DEALHAUS_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/acquisition-run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(300000),
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Acquisition Agent failed with ${response.status}: ${body}`
    );
  }

  console.log("ACQUISITION AGENT RESPONSE:");
  console.log(body);
}

async function runServerWorkflow() {
  const baseUrl =
    process.env.DEALHAUS_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const secret = process.env.WORKFLOW_RUNNER_SECRET;

  if (!secret) {
    throw new Error("WORKFLOW_RUNNER_SECRET is missing.");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/run-full-workflow`,
    {
      method: "POST",
      headers: {
        "x-workflow-secret": secret,
      },
      signal: AbortSignal.timeout(180000),
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Server workflow failed with ${response.status}: ${body}`
    );
  }

  console.log("SERVER BUSINESS WORKFLOW RESPONSE:");
  console.log(body);
}

let running = false;

function runAgent(label, scriptName) {
  console.log("\n======================================");
  console.log(`STARTING ${label}`);
  console.log(new Date().toLocaleString());
  console.log("======================================");

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "facebook",
    scriptName
  );

  const result = spawnSync(
    process.execPath,
    [
      "--env-file=.env.local",
      scriptPath,
      "--once",
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.status}`
    );
  }

  console.log(`\n${label} COMPLETE`);
}

function runAgentSafely(label, scriptName) {
  try {
    runAgent(label, scriptName);

    return {
      label,
      status: "success",
    };
  } catch (error) {
    console.error(
      `\n${label} ERROR:`,
      error.message
    );

    console.log(
      "Master sweep will continue to the next independent stage."
    );

    return {
      label,
      status: "failed",
      error: error.message,
    };
  }
}

async function runMasterSweep() {
  if (running) {
    console.log(
      "Master Facebook sweep already running. Skipping overlap."
    );
    return;
  }

  running = true;

  console.log("\n######################################");
  console.log("DEALHAUS FACEBOOK MASTER SWEEP");
  console.log(new Date().toLocaleString());
  console.log("######################################");

  try {
    const results = [];

    const acquisitionDue =
      lastAcquisitionRunAt === 0 ||
      Date.now() - lastAcquisitionRunAt >=
        ACQUISITION_INTERVAL_MS;

    if (acquisitionDue) {
      try {
        console.log("\n======================================");
        console.log("STARTING OPPORTUNITY ACQUISITION AI");
        console.log(new Date().toLocaleString());
        console.log("======================================");

        await runAcquisitionAgent();

        lastAcquisitionRunAt = Date.now();

        results.push({
          label: "OPPORTUNITY ACQUISITION AI",
          status: "success",
        });

        console.log(
          "\nOPPORTUNITY ACQUISITION AI COMPLETE"
        );
      } catch (error) {
        console.error(
          "\nOPPORTUNITY ACQUISITION AI ERROR:",
          error.message
        );

        results.push({
          label: "OPPORTUNITY ACQUISITION AI",
          status: "failed",
          error: error.message,
        });

        console.log(
          "Master sweep will continue with existing DealHaus work."
        );
      }
    } else {
      const nextRunMinutes = Math.ceil(
        (
          ACQUISITION_INTERVAL_MS -
          (Date.now() - lastAcquisitionRunAt)
        ) / 60000
      );

      console.log(
        `Opportunity Acquisition AI not due. Next scan in approximately ${nextRunMinutes} minutes.`
      );

      results.push({
        label: "OPPORTUNITY ACQUISITION AI",
        status: "success",
      });
    }


    try {
      console.log("\n======================================");
      console.log("STARTING SERVER BUSINESS WORKFLOW");
      console.log(new Date().toLocaleString());
      console.log("======================================");

      await runServerWorkflow();

      results.push({
        label: "SERVER BUSINESS WORKFLOW",
        status: "success",
      });

      console.log("\nSERVER BUSINESS WORKFLOW COMPLETE");
    } catch (error) {
      console.error(
        "\nSERVER BUSINESS WORKFLOW ERROR:",
        error.message
      );

      results.push({
        label: "SERVER BUSINESS WORKFLOW",
        status: "failed",
        error: error.message,
      });

      console.log(
        "Master sweep will continue to the next independent stage."
      );
    }

    results.push(
      runAgentSafely(
        "INITIAL SELLER OUTREACH",
        "initial-seller-outreach-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "SELLER AGENT SWEEP",
        "seller-agent-runner.cjs"
      )
    );

results.push(
  runAgentSafely(
    "MARKETPLACE PUBLISH SWEEP",
    "marketplace-publish-runner.cjs"
  )
);

    results.push(
      runAgentSafely(
        "BUYER AGENT SWEEP",
        "buyer-agent-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "CLOSING TRANSACTION SYNC",
        "closing-agent.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "BUYER CLOSING START",
        "closing-start-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "BUYER CLOSING REPLY CHECK",
        "closing-reply-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "SELLER CLOSING EMAIL",
        "seller-closing-email-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "SELLER TO BUYER RELAY",
        "seller-to-buyer-relay-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "BUYER LOGISTICS REPLY CHECK",
        "closing-logistics-reply-runner.cjs"
      )
    );
    results.push(
      runAgentSafely(
        "MEETUP SCHEDULER",
        "closing-meetup-scheduler-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "BUYER COMPLETION CHECK",
        "buyer-completion-check-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "SELLER COMPLETION CHECK",
        "seller-completion-check-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "BUYER COMPLETION REPLY CHECK",
        "buyer-completion-reply-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "COMPLETION FINALIZER",
        "closing-completion-finalizer-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "INVOICE WORKFLOW",
        "invoice-workflow-runner.cjs"
      )
    );

    results.push(
      runAgentSafely(
        "REVENUE WORKFLOW",
        "revenue-workflow-runner.cjs"
      )
    );
    console.log("\n######################################");
    console.log("MASTER FACEBOOK SWEEP SUMMARY");
    console.log("######################################");

    for (const result of results) {
      console.log(
        `${result.status === "success" ? "PASS" : "FAIL"} - ${result.label}`
      );
    }

    const failures = results.filter(
      (result) => result.status === "failed"
    );

    console.log(
      `\nStages passed: ${results.length - failures.length}`
    );

    console.log(
      `Stages failed: ${failures.length}`
    );

    console.log("\n######################################");
    console.log("MASTER FACEBOOK SWEEP COMPLETE");
    console.log("######################################");
  } finally {
    running = false;
  }
}

console.log("\nDEALHAUS FACEBOOK MASTER AGENT");
console.log("------------------------------------");
console.log(
  "Seller, Buyer, and Closing agents run sequentially."
);
console.log(
  "A failure in one independent stage will not block the remaining stages."
);
console.log(
  "A new master sweep starts every 60 seconds when idle."
);
console.log("Press Ctrl+C to stop.");

runMasterSweep();

setInterval(() => {
  runMasterSweep();
}, CHECK_INTERVAL_MS);


