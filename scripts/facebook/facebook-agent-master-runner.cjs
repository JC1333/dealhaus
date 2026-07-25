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
    runAgent(
      "SELLER AGENT SWEEP",
      "seller-agent-runner.cjs"
    );

    runAgent(
      "BUYER AGENT SWEEP",
      "buyer-agent-runner.cjs"
    );

    console.log("\n######################################");
    console.log("MASTER FACEBOOK SWEEP COMPLETE");
    console.log("######################################");
  } catch (error) {
    console.error(
      "\nMASTER FACEBOOK SWEEP ERROR:",
      error.message
    );
  } finally {
    running = false;
  }
}

console.log("\nDEALHAUS FACEBOOK MASTER AGENT");
console.log("------------------------------------");
console.log(
  "Seller and Buyer agents will run sequentially."
);
console.log(
  "A new master sweep starts every 60 seconds when idle."
);
console.log("Press Ctrl+C to stop.");

runMasterSweep();

setInterval(() => {
  runMasterSweep();
}, CHECK_INTERVAL_MS);