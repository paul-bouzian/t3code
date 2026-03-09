import { Schema } from "effect";
import { TrimmedNonEmptyString } from "./baseSchemas";

export const CodexCatalogProviderOptions = Schema.Struct({
  binaryPath: Schema.optional(TrimmedNonEmptyString),
  homePath: Schema.optional(TrimmedNonEmptyString),
});
export type CodexCatalogProviderOptions = typeof CodexCatalogProviderOptions.Type;

export const CodexCustomPrompt = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
  content: Schema.String,
  description: Schema.NullOr(Schema.String),
  argumentHint: Schema.NullOr(Schema.String),
});
export type CodexCustomPrompt = typeof CodexCustomPrompt.Type;

export const CodexListCustomPromptsInput = Schema.Struct({
  providerOptions: Schema.optional(CodexCatalogProviderOptions),
});
export type CodexListCustomPromptsInput = typeof CodexListCustomPromptsInput.Type;

export const CodexListCustomPromptsResult = Schema.Struct({
  prompts: Schema.Array(CodexCustomPrompt),
});
export type CodexListCustomPromptsResult = typeof CodexListCustomPromptsResult.Type;
