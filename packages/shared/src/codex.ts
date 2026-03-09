import type { CodexCustomPrompt } from "@t3tools/contracts";

export const CODEX_PROMPTS_NAMESPACE = "prompts";
export const CODEX_PROMPTS_SLASH_PREFIX = `/${CODEX_PROMPTS_NAMESPACE}:`;

export interface CodexSkillInvocation {
  name: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface CodexCustomPromptFrontmatter {
  content: string;
  description: string | null;
  argumentHint: string | null;
}

export interface ExpandedCodexPrompt {
  text: string;
}

export interface CodexPromptExpansionError {
  message: string;
}

export interface CodexSkillTokenQuery {
  query: string;
  rangeStart: number;
  rangeEnd: number;
}

const NAMED_PROMPT_ARGUMENT_PATTERN = /\$[A-Z][A-Z0-9_]*/g;
const SKILL_TOKEN_PATTERN = /(^|\s)\$(|[A-Za-z][A-Za-z0-9._-]*)$/;
const SKILL_TOKEN_GLOBAL_PATTERN = /(^|\s)\$([A-Za-z][A-Za-z0-9._-]*)(?=\s|$)/g;

function splitContentLines(content: string): string[] {
  const segments: string[] = [];
  let lineStart = 0;

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== "\n") {
      continue;
    }
    segments.push(content.slice(lineStart, index + 1));
    lineStart = index + 1;
  }

  if (lineStart < content.length) {
    segments.push(content.slice(lineStart));
  }

  return segments;
}

export function parseCodexCustomPromptFrontmatter(content: string): CodexCustomPromptFrontmatter {
  const segments = splitContentLines(content);
  const firstSegment = segments[0];
  if (!firstSegment || firstSegment.replace(/[\r\n]+$/g, "").trim() !== "---") {
    return {
      content,
      description: null,
      argumentHint: null,
    };
  }

  let description: string | null = null;
  let argumentHint: string | null = null;
  let consumed = firstSegment.length;
  let closed = false;

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const trimmedLine = segment.replace(/[\r\n]+$/g, "").trim();
    if (trimmedLine === "---") {
      consumed += segment.length;
      closed = true;
      break;
    }
    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
      consumed += segment.length;
      continue;
    }
    const separatorIndex = trimmedLine.indexOf(":");
    if (separatorIndex > 0) {
      const key = trimmedLine.slice(0, separatorIndex).trim().toLowerCase();
      let value = trimmedLine.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      if (key === "description") {
        description = value;
      } else if (key === "argument-hint" || key === "argument_hint") {
        argumentHint = value;
      }
    }
    consumed += segment.length;
  }

  if (!closed) {
    return {
      content,
      description: null,
      argumentHint: null,
    };
  }

  return {
    content: consumed >= content.length ? "" : content.slice(consumed),
    description,
    argumentHint,
  };
}

function parseSlashCommandName(text: string): { name: string; rest: string } | null {
  if (!text.startsWith("/")) {
    return null;
  }
  let nameEnd = text.length;
  for (let index = 1; index < text.length; index += 1) {
    if (/\s/.test(text[index] ?? "")) {
      nameEnd = index;
      break;
    }
  }
  const name = text.slice(1, nameEnd);
  if (name.length === 0) {
    return null;
  }
  return {
    name,
    rest: text.slice(nameEnd).trimStart(),
  };
}

function tokenizeShellWords(input: string): string[] | null {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? "";
    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }
      if (char === "\\" && quote === '"' && index + 1 < input.length) {
        current += input[index + 1] ?? "";
        index += 1;
        continue;
      }
      current += char;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "\\") {
      if (index + 1 < input.length) {
        current += input[index + 1] ?? "";
        index += 1;
      }
      continue;
    }
    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (quote) {
    return null;
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

function collectNamedPromptArguments(template: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const match of template.matchAll(NAMED_PROMPT_ARGUMENT_PATTERN)) {
    const placeholder = match[0];
    const start = match.index ?? 0;
    if (start > 0 && template[start - 1] === "$" && template[start - 2] !== "$") {
      continue;
    }
    const name = placeholder.slice(1);
    if (name === "ARGUMENTS" || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  return names;
}

function replaceNamedPromptArguments(
  template: string,
  values: Map<string, string>,
): ExpandedCodexPrompt {
  return {
    text: template.replace(/\$\$|\$[A-Z][A-Z0-9_]*/g, (token) => {
      if (token === "$$") {
        return "$$";
      }
      const name = token.slice(1);
      if (name === "ARGUMENTS") {
        return token;
      }
      return values.get(name) ?? "";
    }),
  };
}

function replaceNumericPromptArguments(
  template: string,
  args: readonly string[],
): ExpandedCodexPrompt {
  let result = "";
  for (let index = 0; index < template.length; index += 1) {
    const char = template[index] ?? "";
    if (char !== "$") {
      result += char;
      continue;
    }
    const next = template[index + 1] ?? "";
    if (next === "$") {
      result += "$$";
      index += 1;
      continue;
    }
    if (/[1-9]/.test(next)) {
      result += args[Number(next) - 1] ?? "";
      index += 1;
      continue;
    }
    if (template.startsWith("ARGUMENTS", index + 1)) {
      result += args.join(" ");
      index += "ARGUMENTS".length;
      continue;
    }
    result += char;
  }
  return { text: result };
}

export function expandCodexCustomPromptInvocation(input: {
  text: string;
  prompts: readonly CodexCustomPrompt[];
}): ExpandedCodexPrompt | CodexPromptExpansionError | null {
  const parsed = parseSlashCommandName(input.text);
  if (!parsed) {
    return null;
  }
  if (!parsed.name.startsWith(`${CODEX_PROMPTS_NAMESPACE}:`)) {
    return null;
  }
  const promptName = parsed.name.slice(`${CODEX_PROMPTS_NAMESPACE}:`.length);
  const prompt = input.prompts.find((entry) => entry.name === promptName);
  if (!prompt) {
    return null;
  }

  const namedArguments = collectNamedPromptArguments(prompt.content);
  const tokens = tokenizeShellWords(parsed.rest);
  if (tokens === null) {
    return {
      message: `Could not parse /${parsed.name}: unterminated quoted value.`,
    };
  }

  if (namedArguments.length > 0) {
    const values = new Map<string, string>();
    for (const token of tokens) {
      const separatorIndex = token.indexOf("=");
      if (separatorIndex < 0) {
        return {
          message: `Could not parse /${parsed.name}: expected key=value but found '${token}'. Wrap values in double quotes if they contain spaces.`,
        };
      }
      const key = token.slice(0, separatorIndex);
      if (key.length === 0) {
        return {
          message: `Could not parse /${parsed.name}: expected a name before '=' in '${token}'.`,
        };
      }
      values.set(key, token.slice(separatorIndex + 1));
    }

    const missing = namedArguments.filter((name) => !values.has(name));
    if (missing.length > 0) {
      return {
        message: `Missing required args for /${parsed.name}: ${missing.join(", ")}. Provide as key=value (quote values with spaces).`,
      };
    }

    return replaceNamedPromptArguments(prompt.content, values);
  }

  return replaceNumericPromptArguments(prompt.content, tokens);
}

export function buildCodexPromptCommandLabel(name: string): string {
  return `${CODEX_PROMPTS_SLASH_PREFIX}${name}`;
}

export function matchesCodexPromptQuery(promptName: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  const bareName = promptName.toLowerCase();
  const namespaced = `${CODEX_PROMPTS_NAMESPACE}:${bareName}`;
  return bareName.includes(normalizedQuery) || namespaced.includes(normalizedQuery);
}

export function detectCodexSkillTokenQuery(
  text: string,
  cursor: number,
): CodexSkillTokenQuery | null {
  const safeCursor = Math.max(0, Math.min(text.length, Math.floor(cursor)));
  let tokenStart = safeCursor;
  while (tokenStart > 0 && !/\s/.test(text[tokenStart - 1] ?? "")) {
    tokenStart -= 1;
  }
  const token = text.slice(tokenStart, safeCursor);
  const match = SKILL_TOKEN_PATTERN.exec(token);
  if (!match) {
    return null;
  }
  const name = match[2] ?? "";
  return {
    query: name,
    rangeStart: tokenStart + (match[1] ?? "").length,
    rangeEnd: safeCursor,
  };
}

export function extractCodexSkillInvocations(text: string): CodexSkillInvocation[] {
  const matches: CodexSkillInvocation[] = [];
  for (const match of text.matchAll(SKILL_TOKEN_GLOBAL_PATTERN)) {
    const prefix = match[1] ?? "";
    const name = match[2] ?? "";
    const matchIndex = match.index ?? 0;
    const rangeStart = matchIndex + prefix.length;
    matches.push({
      name,
      rangeStart,
      rangeEnd: rangeStart + name.length + 1,
    });
  }
  return matches;
}
