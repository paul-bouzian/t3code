import type { CodexCustomPrompt } from "@t3tools/contracts";
import { matchesCodexPromptQuery } from "@t3tools/shared/codex";

import type { ComposerTriggerKind } from "./composer-logic";

export function describeCodexCustomPrompt(prompt: CodexCustomPrompt): string {
  return prompt.description ?? prompt.argumentHint ?? "Custom Codex prompt";
}

export function matchesCodexCustomPrompt(prompt: CodexCustomPrompt, query: string): boolean {
  return matchesCodexPromptQuery(prompt.name, query);
}

export function getComposerMenuEmptyMessage(
  triggerKind: ComposerTriggerKind | null,
  isLoading: boolean,
): string {
  if (isLoading) {
    return triggerKind === "path" ? "Searching workspace files..." : "Loading Codex prompts...";
  }

  return triggerKind === "path" ? "No matching files or folders." : "No matching command.";
}
