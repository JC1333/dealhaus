const { spawn } = require("child_process");
const path = require("path");

const CHECK_INTERVAL_MS = 60 * 1000;
const RUN_ONCE = process.argv.includes("--once");
let running = false;

async function runBuyerAgent() {
  if (running) {
    console.log("Buyer Agent is already running. Skipping overlapping run.");
    return;
  }

  running = true;

  console.log("\n======================================");
  console.log("DEALHAUS BUYER AGENT RUN");
  console.log(new Date().toLocaleString());
  console.log("======================================");

  const agentPath = path.join(
    process.cwd(),
    "scripts",
    "facebook",
    "buyer-agent.cjs"
  );

  const child = spawn(
    process.execPath,
    ["--env-file=.env.local", agentPath],
    {
      cwd: process.cwd(),
      stdio: "inherit",
    }
  );

  child.on("error", (error) => {
    console.error(
      "BUYER AGENT PROCESS ERROR:",
      error.message
    );

    running = false;
  });

  child.on("exit", (code) => {
  console.log(
    `Buyer Agent finished with exit code ${code}.`
  );

  running = false;

  if (RUN_ONCE) {
    console.log("Buyer Agent single sweep complete.");
    process.exit(code || 0);
  }
});
}

console.log("\nDEALHAUS FACEBOOK BUYER AGENT RUNNER");
console.log("------------------------------------");
console.log(
  RUN_ONCE
    ? "Single buyer sweep mode."
    : "Checking Marketplace once every 60 seconds."
);
console.log("Press Ctrl+C to stop.");

if (RUN_ONCE) {
  runBuyerAgent();
} else {
  runBuyerAgent();

  setInterval(() => {
    runBuyerAgent();
  }, CHECK_INTERVAL_MS);
}