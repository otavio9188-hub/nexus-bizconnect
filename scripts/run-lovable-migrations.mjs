import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const migrationUrl = process.env.LOVABLE_DB_MIGRATION_URL?.trim();

if (!migrationUrl) {
  console.log("[Nexus migrations] LOVABLE_DB_MIGRATION_URL not available; skipping database migration.");
  process.exit(0);
}

const localBin = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "drizzle-kit.cmd" : "drizzle-kit",
);

const command = existsSync(localBin) ? localBin : "drizzle-kit";

console.log("[Nexus migrations] Applying pending Drizzle migrations...");

const result = spawnSync(command, ["migrate"], {
  stdio: "inherit",
  env: {
    ...process.env,
    LOVABLE_DB_MIGRATION_URL: migrationUrl,
  },
});

if (result.error) {
  console.error("[Nexus migrations] Failed to start drizzle-kit:", result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error("[Nexus migrations] drizzle-kit migrate failed.");
  process.exit(result.status ?? 1);
}

console.log("[Nexus migrations] Database migrations completed.");
