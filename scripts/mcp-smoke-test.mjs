import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn("npx", ["tsx", "src/server.ts"], {
  cwd: root,
  stdio: ["pipe", "pipe", "inherit"],
  shell: true,
});

let id = 0;
const pending = new Map();

function send(method, params = {}) {
  const msg = { jsonrpc: "2.0", id: ++id, method, params };
  server.stdin.write(JSON.stringify(msg) + "\n");
  return new Promise((resolve, reject) => {
    pending.set(msg.id, { resolve, reject, method });
    setTimeout(() => reject(new Error(`Timeout: ${method}`)), 15000);
  });
}

const rl = createInterface({ input: server.stdout });
rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, method } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
      else resolve(msg.result);
    }
  } catch {
    /* ignore non-json */
  }
});

try {
  const init = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "1.0.0" },
  });
  console.log("initialize:", init?.serverInfo?.name ?? init);

  server.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n"
  );

  const tools = await send("tools/list");
  console.log(
    "tools/list:",
    tools.tools.map((t) => t.name).join(", ")
  );

  const weather = await send("tools/call", {
    name: "get_weather",
    arguments: { location: "pune" },
  });
  const parsed = JSON.parse(weather.content[0].text);
  console.log("tools/call get_weather:", parsed.success ? "OK" : parsed.error);

  const resources = await send("resources/list");
  console.log("resources/list:", resources.resources.length, "resources");

  console.log("\nMCP stdio protocol: PASS");
  process.exit(0);
} catch (e) {
  console.error("\nMCP stdio protocol: FAIL", e.message);
  process.exit(1);
} finally {
  server.kill();
}
