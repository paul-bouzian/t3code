import { describe, expect, it } from "vitest";

import type { CodexCustomPrompt } from "@t3tools/contracts";

import {
  describeCodexCustomPrompt,
  getComposerMenuEmptyMessage,
  matchesCodexCustomPrompt,
} from "./codexComposer";

const customPrompt: CodexCustomPrompt = {
  name: "code-simplifier",
  path: "/tmp/prompts/code-simplifier.md",
  content: "Simplify this code",
  description: null,
  argumentHint: "FILE=path",
};

describe("codexComposer", () => {
  it("prefers prompt descriptions and falls back to the argument hint", () => {
    expect(describeCodexCustomPrompt(customPrompt)).toBe("FILE=path");
  });

  it("matches custom prompts using the namespaced prompt syntax", () => {
    expect(matchesCodexCustomPrompt(customPrompt, "prompts:code")).toBe(true);
  });

  it("formats empty-state messages consistently", () => {
    expect(getComposerMenuEmptyMessage("slash-command", true)).toBe("Loading Codex prompts...");
    expect(getComposerMenuEmptyMessage("slash-command", false)).toBe("No matching command.");
  });
});
