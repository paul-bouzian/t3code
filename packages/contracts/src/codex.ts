import { Schema } from "effect";

import { TrimmedNonEmptyString } from "./baseSchemas";

export const CODEX_MAX_SKILL_SELECTIONS = 64;

export const CodexCatalogProviderOptions = Schema.Struct({
  binaryPath: Schema.optional(TrimmedNonEmptyString),
  homePath: Schema.optional(TrimmedNonEmptyString),
});
export type CodexCatalogProviderOptions = typeof CodexCatalogProviderOptions.Type;

export const CodexSkillSelection = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
});
export type CodexSkillSelection = typeof CodexSkillSelection.Type;

export const CodexSkillScope = Schema.Literals(["user", "repo", "system", "admin"]);
export type CodexSkillScope = typeof CodexSkillScope.Type;

export const CodexSkillInterface = Schema.Struct({
  displayName: Schema.optional(Schema.NullOr(Schema.String)),
  shortDescription: Schema.optional(Schema.NullOr(Schema.String)),
  iconSmall: Schema.optional(Schema.NullOr(Schema.String)),
  iconLarge: Schema.optional(Schema.NullOr(Schema.String)),
  brandColor: Schema.optional(Schema.NullOr(Schema.String)),
  defaultPrompt: Schema.optional(Schema.NullOr(Schema.String)),
});
export type CodexSkillInterface = typeof CodexSkillInterface.Type;

export const CodexSkill = Schema.Struct({
  name: TrimmedNonEmptyString,
  description: Schema.String,
  shortDescription: Schema.optional(Schema.String),
  interface: Schema.optional(CodexSkillInterface),
  path: TrimmedNonEmptyString,
  scope: CodexSkillScope,
  enabled: Schema.Boolean,
});
export type CodexSkill = typeof CodexSkill.Type;

export const CodexSkillError = Schema.Struct({
  path: Schema.optional(TrimmedNonEmptyString),
  message: Schema.String,
});
export type CodexSkillError = typeof CodexSkillError.Type;

export const CodexListSkillsInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  providerOptions: Schema.optional(CodexCatalogProviderOptions),
  forceReload: Schema.optional(Schema.Boolean),
});
export type CodexListSkillsInput = typeof CodexListSkillsInput.Type;

export const CodexListSkillsResult = Schema.Struct({
  skills: Schema.Array(CodexSkill),
  errors: Schema.Array(CodexSkillError),
});
export type CodexListSkillsResult = typeof CodexListSkillsResult.Type;
