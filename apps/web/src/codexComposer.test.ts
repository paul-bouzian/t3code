import { describe, expect, it } from "vitest";

import type { CodexSkill } from "@t3tools/contracts";

import {
  describeCodexSkill,
  getComposerMenuEmptyMessage,
  matchesCodexSkillQuery,
  toCodexSkillSelectionsForSend,
} from "./codexComposer";

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
