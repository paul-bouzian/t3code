import type { CodexCustomPrompt, CodexSkill } from "@t3tools/contracts";
import { matchesCodexPromptQuery } from "@t3tools/shared/codex";

import type { ComposerTriggerKind } from "./composer-logic";
import type { ComposerSkillSelection } from "./codexSkillSelections";

export function describeCodexCustomPrompt(prompt: CodexCustomPrompt): string {
  return prompt.description ?? prompt.argumentHint ?? "Custom Codex prompt";
}

export function formatCodexSkillScope(scope: CodexSkill["scope"]): string {
  switch (scope) {
    case "admin":
      return "admin";
    case "repo":
      return "repo";
    case "system":
      return "system";
    case "user":
    default:
      return "user";
  }
}

export function describeCodexSkill(skill: CodexSkill): string {
  return `${formatCodexSkillScope(skill.scope)} · ${skill.path}`;
}

export function matchesCodexSkillQuery(skill: CodexSkill, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  const displayName = skill.interface?.displayName?.toLowerCase() ?? "";
  const description = skill.shortDescription?.toLowerCase() ?? skill.description.toLowerCase();
  return (
    skill.name.toLowerCase().includes(normalizedQuery) ||
    displayName.includes(normalizedQuery) ||
    description.includes(normalizedQuery) ||
    skill.path.toLowerCase().includes(normalizedQuery) ||
    skill.scope.toLowerCase().includes(normalizedQuery)
  );
}

export function matchesCodexCustomPrompt(prompt: CodexCustomPrompt, query: string): boolean {
  return matchesCodexPromptQuery(prompt.name, query);
}

export function getComposerMenuEmptyMessage(
  triggerKind: ComposerTriggerKind | null,
  isLoading: boolean,
): string {
  if (isLoading) {
    if (triggerKind === "path") {
      return "Searching workspace files...";
    }
    if (triggerKind === "skill") {
      return "Loading Codex skills...";
    }
    return "Loading Codex prompts...";
  }

  if (triggerKind === "path") {
    return "No matching files or folders.";
  }
  if (triggerKind === "skill") {
    return "No matching Codex skill.";
  }
  return "No matching command.";
}

export function toCodexSkillSelectionsForSend(
  selections: readonly ComposerSkillSelection[],
): Array<{ name: string; path: string }> {
  return selections.map(({ name, path }) => ({ name, path }));
}
