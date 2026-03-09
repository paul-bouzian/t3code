import { describe, expect, it } from "vitest";

import type { CodexCustomPrompt, CodexSkill } from "@t3tools/contracts";

import {
  describeCodexCustomPrompt,
  describeCodexSkill,
  getComposerMenuEmptyMessage,
  matchesCodexCustomPrompt,
  matchesCodexSkillQuery,
  toCodexSkillSelectionsForSend,
} from "./codexComposer";

const customPrompt: CodexCustomPrompt = {
  name: "code-simplifier",
  path: "/tmp/prompts/code-simplifier.md",
  content: "Simplify this code",
  description: null,
  argumentHint: "FILE=path",
};

const codexSkill: CodexSkill = {
  name: "code-review",
  description: "Review code for correctness and maintainability",
  shortDescription: "PR review",
  interface: {
    displayName: "Code Review",
  },
  path: "/tmp/skills/code-review/SKILL.md",
  scope: "user",
  enabled: true,
};

describe("codexComposer", () => {
  it("prefers prompt descriptions and falls back to the argument hint", () => {
    expect(describeCodexCustomPrompt(customPrompt)).toBe("FILE=path");
  });

  it("matches custom prompts using the namespaced prompt syntax", () => {
    expect(matchesCodexCustomPrompt(customPrompt, "prompts:code")).toBe(true);
  });

  it("matches Codex skills against multiple searchable fields", () => {
    expect(matchesCodexSkillQuery(codexSkill, "pr review")).toBe(true);
    expect(matchesCodexSkillQuery(codexSkill, "skills/code-review")).toBe(true);
    expect(matchesCodexSkillQuery(codexSkill, "missing")).toBe(false);
  });

  it("formats skill labels and empty-state messages consistently", () => {
    expect(describeCodexSkill(codexSkill)).toBe("user · /tmp/skills/code-review/SKILL.md");
    expect(getComposerMenuEmptyMessage("skill", true)).toBe("Loading Codex skills...");
    expect(getComposerMenuEmptyMessage("skill", false)).toBe("No matching Codex skill.");
  });

  it("maps composer skill selections to the provider payload shape", () => {
    expect(
      toCodexSkillSelectionsForSend([
        {
          name: "code-review",
          path: "/tmp/skills/code-review/SKILL.md",
          rangeStart: 0,
          rangeEnd: 12,
        },
      ]),
    ).toEqual([
      {
        name: "code-review",
        path: "/tmp/skills/code-review/SKILL.md",
      },
    ]);
  });
});
