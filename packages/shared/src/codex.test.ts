import { describe, expect, it } from "vitest";

import { detectCodexSkillTokenQuery, extractCodexSkillInvocations } from "./codex";

describe("skill token helpers", () => {
  it("detects a bare skill trigger with an empty query", () => {
    expect(detectCodexSkillTokenQuery("Use $", "Use $".length)).toEqual({
      query: "",
      rangeStart: 4,
      rangeEnd: 5,
    });
  });

  it("detects the active skill token query", () => {
    expect(detectCodexSkillTokenQuery("Use $code-re", "Use $code-re".length)).toEqual({
      query: "code-re",
      rangeStart: 4,
      rangeEnd: 12,
    });
  });

  it("extracts skill invocations with ranges", () => {
    expect(extractCodexSkillInvocations("Use $figma and $code-review now")).toEqual([
      { name: "figma", rangeStart: 4, rangeEnd: 10 },
      { name: "code-review", rangeStart: 15, rangeEnd: 27 },
    ]);
  });
});
