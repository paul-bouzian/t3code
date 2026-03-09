import type { CodexCatalogProviderOptions } from "@t3tools/contracts";
import { queryOptions } from "@tanstack/react-query";
import { ensureNativeApi } from "../nativeApi";

interface CodexCustomPromptsQueryInput {
  providerOptions?: CodexCatalogProviderOptions | undefined;
  enabled?: boolean;
}

interface CodexSkillsQueryInput {
  cwd: string | null;
  providerOptions?: CodexCatalogProviderOptions | undefined;
  enabled?: boolean;
}

export const codexQueryKeys = {
  all: ["codex"] as const,
  customPrompts: (input?: CodexCustomPromptsQueryInput) =>
    [
      "codex",
      "customPrompts",
      input?.providerOptions?.binaryPath ?? null,
      input?.providerOptions?.homePath ?? null,
    ] as const,
  skills: (input: CodexSkillsQueryInput) =>
    [
      "codex",
      "skills",
      input.cwd,
      input.providerOptions?.binaryPath ?? null,
      input.providerOptions?.homePath ?? null,
    ] as const,
};

export function codexCustomPromptsQueryOptions(input?: CodexCustomPromptsQueryInput) {
  return queryOptions({
    queryKey: codexQueryKeys.customPrompts(input),
    queryFn: async () => {
      const api = ensureNativeApi();
      return api.codex.listCustomPrompts(
        input?.providerOptions ? { providerOptions: input.providerOptions } : undefined,
      );
    },
    enabled: input?.enabled ?? true,
    staleTime: 15_000,
  });
}

export function codexSkillsQueryOptions(input: CodexSkillsQueryInput) {
  return queryOptions({
    queryKey: codexQueryKeys.skills(input),
    queryFn: async () => {
      if (!input.cwd) {
        throw new Error("Codex skills require a working directory.");
      }
      const api = ensureNativeApi();
      return api.codex.listSkills({
        cwd: input.cwd,
        ...(input.providerOptions ? { providerOptions: input.providerOptions } : {}),
      });
    },
    enabled: (input.enabled ?? true) && Boolean(input.cwd),
    staleTime: 15_000,
  });
}
