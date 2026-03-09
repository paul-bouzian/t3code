import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  CodexCatalogProviderOptions,
  CodexCustomPrompt,
  CodexListCustomPromptsResult,
} from "@t3tools/contracts";
import { parseCodexCustomPromptFrontmatter } from "@t3tools/shared/codex";

function expandHomePath(input: string): string {
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function resolveCodexHomePath(homePath?: string): string {
  const configuredHome = homePath?.trim() || process.env.CODEX_HOME?.trim();
  return configuredHome ? expandHomePath(configuredHome) : path.join(os.homedir(), ".codex");
}

export async function listCodexCustomPrompts(input?: {
  readonly providerOptions?: CodexCatalogProviderOptions;
}): Promise<CodexListCustomPromptsResult> {
  const promptsDir = path.join(resolveCodexHomePath(input?.providerOptions?.homePath), "prompts");
  const directoryEntries = await fs.readdir(promptsDir, { withFileTypes: true }).catch(() => []);
  const prompts: CodexCustomPrompt[] = [];

  for (const entry of directoryEntries) {
    const fullPath = path.join(promptsDir, entry.name);
    const stats = await fs.stat(fullPath).catch(() => null);
    if (!stats?.isFile()) {
      continue;
    }
    if (path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }
    const name = path.basename(entry.name, path.extname(entry.name));
    if (!name) {
      continue;
    }
    const rawContent = await fs.readFile(fullPath, "utf8").catch(() => null);
    if (rawContent === null) {
      continue;
    }
    const parsed = parseCodexCustomPromptFrontmatter(rawContent);
    prompts.push({
      name,
      path: fullPath,
      content: parsed.content,
      description: parsed.description,
      argumentHint: parsed.argumentHint,
    });
  }

  prompts.sort((left, right) => left.name.localeCompare(right.name));
  return { prompts };
}
