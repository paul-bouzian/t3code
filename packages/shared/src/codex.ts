export interface CodexSkillInvocation {
  name: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface CodexSkillTokenQuery {
  query: string;
  rangeStart: number;
  rangeEnd: number;
}

const SKILL_TOKEN_PATTERN = /(^|\s)\$(|[A-Za-z][A-Za-z0-9._-]*)$/;
const SKILL_TOKEN_GLOBAL_PATTERN = /(^|\s)\$([A-Za-z][A-Za-z0-9._-]*)(?=\s|$)/g;

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
