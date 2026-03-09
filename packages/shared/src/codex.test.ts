import { describe, expect, it } from "vitest";
import {
  buildCodexPromptCommandLabel,
  expandCodexCustomPromptInvocation,
  matchesCodexPromptQuery,
  parseCodexCustomPromptFrontmatter,
} from "./codex";

describe("parseCodexCustomPromptFrontmatter", () => {
  it("returns original content when no frontmatter exists", () => {
    expect(parseCodexCustomPromptFrontmatter("hello")).toEqual({
      content: "hello",
      description: null,
      argumentHint: null,
    });
  });

  it("parses prompt metadata and strips frontmatter", () => {
    expect(
      parseCodexCustomPromptFrontmatter(
        "---\ndescription: \"Quick review\"\nargument-hint: \"[file]\"\n---\nBody",
      ),
    ).toEqual({
      content: "Body",
      description: "Quick review",
      argumentHint: "[file]",
    });
  });
});

describe("expandCodexCustomPromptInvocation", () => {
  const prompts = [
    {
      name: "code-simplifier",
      path: "/tmp/code-simplifier.md",
      content: "Simplify this code:\n$ARGUMENTS",
      description: null,
      argumentHint: null,
    },
    {
      name: "review",
      path: "/tmp/review.md",
      content: "Review $FILE for $PRIORITY",
      description: "Review a file",
      argumentHint: "[file] [priority]",
    },
  ] as const;

  it("returns null for non-prompt input", () => {
    expect(expandCodexCustomPromptInvocation({ text: "hello", prompts })).toBeNull();
  });

  it("expands positional arguments", () => {
    expect(
      expandCodexCustomPromptInvocation({
        text: "/prompts:code-simplifier \"src/index.ts\" --fast",
        prompts,
      }),
    ).toEqual({
      text: "Simplify this code:\nsrc/index.ts --fast",
    });
  });

  it("expands named arguments", () => {
    expect(
      expandCodexCustomPromptInvocation({
        text: "/prompts:review FILE=\"src/index.ts\" PRIORITY=high",
        prompts,
      }),
    ).toEqual({
      text: "Review src/index.ts for high",
    });
  });

  it("returns a parse error for malformed named args", () => {
    expect(
      expandCodexCustomPromptInvocation({
        text: "/prompts:review FILE=src/index.ts stray",
        prompts,
      }),
    ).toEqual({
      message:
        "Could not parse /prompts:review: expected key=value but found 'stray'. Wrap values in double quotes if they contain spaces.",
    });
  });

  it("returns an error for missing required args", () => {
    expect(
      expandCodexCustomPromptInvocation({
        text: "/prompts:review FILE=src/index.ts",
        prompts,
      }),
    ).toEqual({
      message:
        "Missing required args for /prompts:review: PRIORITY. Provide as key=value (quote values with spaces).",
    });
  });
});

describe("prompt matching helpers", () => {
  it("builds the namespaced slash label", () => {
    expect(buildCodexPromptCommandLabel("review")).toBe("/prompts:review");
  });

  it("matches both bare and namespaced prompt queries", () => {
    expect(matchesCodexPromptQuery("code-simplifier", "code")).toBe(true);
    expect(matchesCodexPromptQuery("code-simplifier", "prompts:code")).toBe(true);
    expect(matchesCodexPromptQuery("code-simplifier", "other")).toBe(false);
  });
});
