#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const workflow = "personal-desktop-release.yml";
const ref = process.argv[2]?.trim() || "main";

const result = spawnSync("gh", ["workflow", "run", workflow, "--ref", ref], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`[personal-release] Failed to start workflow: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
