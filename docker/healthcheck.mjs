// Docker's health check of the app in production (CLAUDE.md, 13. mérföldkő,
// "Állapotfigyelés"). Plain Docker Compose marks a container unhealthy but
// does not restart it (only Swarm does), so after three failures in a row this
// stops the app, and the "unless-stopped" restart policy starts it again.
// No extra container and no access to the Docker socket is needed.

import { readFileSync, writeFileSync } from "node:fs";

const COUNTER = "/tmp/health-failures";
const LIMIT = 3;

function failures() {
  try {
    return Number(readFileSync(COUNTER, "utf8")) || 0;
  } catch {
    return 0;
  }
}

let healthy = false;
try {
  const response = await fetch("http://127.0.0.1:3000/api/health", { signal: AbortSignal.timeout(8000) });
  healthy = response.ok;
} catch {
  healthy = false;
}

if (healthy) {
  writeFileSync(COUNTER, "0");
  process.exit(0);
}

const count = failures() + 1;
writeFileSync(COUNTER, String(count));
if (count >= LIMIT) {
  console.error(`Health check failed ${count} times in a row: stopping the app so that Docker restarts it.`);
  writeFileSync(COUNTER, "0");
  process.kill(1, "SIGTERM");
}
process.exit(1);
