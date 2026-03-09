import type { CodexCatalogProviderOptions } from "@t3tools/contracts";
import { queryOptions } from "@tanstack/react-query";
import { ensureNativeApi } from "../nativeApi";

interface CodexCustomPromptsQueryInput {
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
