const { spawnSync } = require("child_process");
const path = require("path");

const CHECK_INTERVAL_MS = 60 * 1000;

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

    results.push(
      runAgentSafely(
        "SELLER AGENT SWEEP",
        "seller-agent-runner.cjs"
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

