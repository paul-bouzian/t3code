import { ProjectId, ThreadId } from "@t3tools/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

vi.hoisted(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
    writable: true,
  });
});

import { type ComposerImageAttachment, useComposerDraftStore } from "./composerDraftStore";

beforeEach(() => {
  globalThis.localStorage.clear();
});

function makeImage(input: {
  id: string;
  previewUrl: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  lastModified?: number;
}): ComposerImageAttachment {
  const name = input.name ?? "image.png";
  const mimeType = input.mimeType ?? "image/png";
  const sizeBytes = input.sizeBytes ?? 4;
  const lastModified = input.lastModified ?? 1_700_000_000_000;
  const file = new File([new Uint8Array(sizeBytes).fill(1)], name, {
    type: mimeType,
    lastModified,
  });
  return {
    type: "image",
    id: input.id,
    name,
    mimeType,
    sizeBytes: file.size,
    previewUrl: input.previewUrl,
    file,
  };
}

describe("composerDraftStore addImages", () => {
  const threadId = ThreadId.makeUnsafe("thread-dedupe");
  let originalRevokeObjectUrl: typeof URL.revokeObjectURL;
  let revokeSpy: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
    originalRevokeObjectUrl = URL.revokeObjectURL;
    revokeSpy = vi.fn();
    URL.revokeObjectURL = revokeSpy;
  });

  afterEach(() => {
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("deduplicates identical images in one batch by file signature", () => {
    const first = makeImage({
      id: "img-1",
      previewUrl: "blob:first",
      name: "same.png",
      mimeType: "image/png",
      sizeBytes: 12,
      lastModified: 12345,
    });
    const duplicate = makeImage({
      id: "img-2",
      previewUrl: "blob:duplicate",
      name: "same.png",
      mimeType: "image/png",
      sizeBytes: 12,
      lastModified: 12345,
    });

    useComposerDraftStore.getState().addImages(threadId, [first, duplicate]);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.images.map((image) => image.id)).toEqual(["img-1"]);
    expect(revokeSpy).toHaveBeenCalledWith("blob:duplicate");
  });

  it("deduplicates against existing images across calls by file signature", () => {
    const first = makeImage({
      id: "img-a",
      previewUrl: "blob:a",
      name: "same.png",
      mimeType: "image/png",
      sizeBytes: 9,
      lastModified: 777,
    });
    const duplicateLater = makeImage({
      id: "img-b",
      previewUrl: "blob:b",
      name: "same.png",
      mimeType: "image/png",
      sizeBytes: 9,
      lastModified: 999,
    });

    useComposerDraftStore.getState().addImage(threadId, first);
    useComposerDraftStore.getState().addImage(threadId, duplicateLater);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.images.map((image) => image.id)).toEqual(["img-a"]);
    expect(revokeSpy).toHaveBeenCalledWith("blob:b");
  });

  it("does not revoke blob URLs that are still used by an accepted duplicate image", () => {
    const first = makeImage({
      id: "img-shared",
      previewUrl: "blob:shared",
    });
    const duplicateSameUrl = makeImage({
      id: "img-shared",
      previewUrl: "blob:shared",
    });

    useComposerDraftStore.getState().addImages(threadId, [first, duplicateSameUrl]);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft?.images.map((image) => image.id)).toEqual(["img-shared"]);
    expect(revokeSpy).not.toHaveBeenCalledWith("blob:shared");
  });
});

describe("composerDraftStore clearComposerContent", () => {
  const threadId = ThreadId.makeUnsafe("thread-clear");
  let originalRevokeObjectUrl: typeof URL.revokeObjectURL;
  let revokeSpy: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
    originalRevokeObjectUrl = URL.revokeObjectURL;
    revokeSpy = vi.fn();
    URL.revokeObjectURL = revokeSpy;
  });

  afterEach(() => {
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("does not revoke blob preview URLs when clearing composer content", () => {
    const first = makeImage({
      id: "img-optimistic",
      previewUrl: "blob:optimistic",
    });
    useComposerDraftStore.getState().addImage(threadId, first);

    useComposerDraftStore.getState().clearComposerContent(threadId);

    const draft = useComposerDraftStore.getState().draftsByThreadId[threadId];
    expect(draft).toBeUndefined();
    expect(revokeSpy).not.toHaveBeenCalledWith("blob:optimistic");
  });

  it("clears stored Codex skill selections alongside the prompt", () => {
    useComposerDraftStore.setState({
      draftsByThreadId: {
        [threadId]: {
          prompt: "Use $code-review",
          images: [],
          nonPersistedImageIds: [],
          persistedAttachments: [],
          skillSelections: [
            {
              name: "code-review",
              path: "/tmp/code-review/SKILL.md",
              rangeStart: 4,
              rangeEnd: 16,
            },
          ],
          provider: null,
          model: null,
          runtimeMode: null,
          interactionMode: null,
          effort: null,
          codexFastMode: false,
        },
      },
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });

    useComposerDraftStore.getState().clearComposerContent(threadId);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });
});

describe("composerDraftStore skillSelections", () => {
  const threadId = ThreadId.makeUnsafe("thread-skills");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
  });

  it("drops stale skill bindings when the token is removed from the prompt", () => {
    const store = useComposerDraftStore.getState();
    store.setPrompt(threadId, "Use $code-review now");
    store.setSkillSelections(threadId, [
      {
        name: "code-review",
        path: "/tmp/code-review/SKILL.md",
        rangeStart: 4,
        rangeEnd: 16,
      },
    ]);

    store.setPrompt(threadId, "Use now");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.skillSelections).toEqual(
      [],
    );
  });

  it("shifts skill binding ranges when text is inserted before the token", () => {
    const store = useComposerDraftStore.getState();
    store.setPrompt(threadId, "$code-review now");
    store.setSkillSelections(threadId, [
      {
        name: "code-review",
        path: "/tmp/code-review/SKILL.md",
        rangeStart: 0,
        rangeEnd: 12,
      },
    ]);

    store.setPrompt(threadId, "Please $code-review now");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.skillSelections).toEqual([
      {
        name: "code-review",
        path: "/tmp/code-review/SKILL.md",
        rangeStart: 7,
        rangeEnd: 19,
      },
    ]);
  });
});

describe("composerDraftStore project draft thread mapping", () => {
  const projectId = ProjectId.makeUnsafe("project-a");
  const otherProjectId = ProjectId.makeUnsafe("project-b");
  const threadId = ThreadId.makeUnsafe("thread-a");
  const otherThreadId = ThreadId.makeUnsafe("thread-b");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
  });

  it("stores and reads project draft thread ids via actions", () => {
    const store = useComposerDraftStore.getState();
    expect(store.getDraftThreadByProjectId(projectId)).toBeNull();
    expect(store.getDraftThread(threadId)).toBeNull();

    store.setProjectDraftThreadId(projectId, threadId, {
      branch: "feature/test",
      worktreePath: "/tmp/worktree-test",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)).toEqual({
      threadId,
      projectId,
      branch: "feature/test",
      worktreePath: "/tmp/worktree-test",
      envMode: "worktree",
      runtimeMode: "full-access",
      interactionMode: "default",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toEqual({
      projectId,
      branch: "feature/test",
      worktreePath: "/tmp/worktree-test",
      envMode: "worktree",
      runtimeMode: "full-access",
      interactionMode: "default",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("clears only matching project draft mapping entries", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId);
    store.setPrompt(threadId, "hello");

    store.clearProjectDraftThreadById(projectId, otherThreadId);
    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)?.threadId).toBe(
      threadId,
    );

    store.clearProjectDraftThreadById(projectId, threadId);
    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)).toBeNull();
    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toBeNull();
    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("clears project draft mapping by project id", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId);
    store.setPrompt(threadId, "hello");
    store.clearProjectDraftThreadId(projectId);
    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)).toBeNull();
    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toBeNull();
    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("clears orphaned composer drafts when remapping a project to a new draft thread", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId);
    store.setPrompt(threadId, "orphan me");

    store.setProjectDraftThreadId(projectId, otherThreadId);

    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)?.threadId).toBe(
      otherThreadId,
    );
    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toBeNull();
    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });

  it("keeps composer drafts when the thread is still mapped by another project", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId);
    store.setProjectDraftThreadId(otherProjectId, threadId);
    store.setPrompt(threadId, "keep me");

    store.clearProjectDraftThreadId(projectId);

    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)).toBeNull();
    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(otherProjectId)?.threadId).toBe(
      threadId,
    );
    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.prompt).toBe("keep me");
  });

  it("clears draft registration independently", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId);
    store.clearDraftThread(threadId);
    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)).toBeNull();
    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toBeNull();
  });

  it("updates branch context on an existing draft thread", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId, {
      branch: "main",
      worktreePath: null,
    });
    store.setDraftThreadContext(threadId, {
      branch: "feature/next",
      worktreePath: "/tmp/feature-next",
    });
    expect(useComposerDraftStore.getState().getDraftThreadByProjectId(projectId)?.threadId).toBe(
      threadId,
    );
    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toMatchObject({
      projectId,
      branch: "feature/next",
      worktreePath: "/tmp/feature-next",
      envMode: "worktree",
    });
  });

  it("preserves existing branch and worktree when setProjectDraftThreadId receives undefined", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId, {
      branch: "main",
      worktreePath: "/tmp/main-worktree",
    });
    const runtimeUndefinedOptions = {
      branch: undefined,
      worktreePath: undefined,
    } as unknown as {
      branch?: string | null;
      worktreePath?: string | null;
    };
    store.setProjectDraftThreadId(projectId, threadId, runtimeUndefinedOptions);

    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toMatchObject({
      projectId,
      branch: "main",
      worktreePath: "/tmp/main-worktree",
      envMode: "worktree",
    });
  });

  it("preserves worktree env mode without a worktree path", () => {
    const store = useComposerDraftStore.getState();
    store.setProjectDraftThreadId(projectId, threadId, {
      branch: "feature/base",
      worktreePath: null,
      envMode: "worktree",
    });
    const runtimeUndefinedOptions = {
      branch: undefined,
      worktreePath: undefined,
      envMode: undefined,
    } as unknown as {
      branch?: string | null;
      worktreePath?: string | null;
      envMode?: "local" | "worktree";
    };
    store.setProjectDraftThreadId(projectId, threadId, runtimeUndefinedOptions);

    expect(useComposerDraftStore.getState().getDraftThread(threadId)).toMatchObject({
      projectId,
      branch: "feature/base",
      worktreePath: null,
      envMode: "worktree",
    });
  });
});

describe("composerDraftStore codex fast mode", () => {
  const threadId = ThreadId.makeUnsafe("thread-service-tier");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
  });

  it("stores codex fast mode in the draft", () => {
    const store = useComposerDraftStore.getState();
    store.setCodexFastMode(threadId, true);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.codexFastMode).toBe(true);
  });

  it("clears codex fast mode when reset to the default", () => {
    const store = useComposerDraftStore.getState();
    store.setCodexFastMode(threadId, true);
    store.setCodexFastMode(threadId, false);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });
});

describe("composerDraftStore setModel", () => {
  const threadId = ThreadId.makeUnsafe("thread-model");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
  });

  it("keeps explicit DEFAULT_MODEL overrides instead of coercing to null", () => {
    const store = useComposerDraftStore.getState();

    store.setModel(threadId, "gpt-5.3-codex");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.model).toBe("gpt-5.3-codex");
  });
});

describe("composerDraftStore setProvider", () => {
  const threadId = ThreadId.makeUnsafe("thread-provider");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
  });

  it("persists provider-only selection even when prompt/model are empty", () => {
    const store = useComposerDraftStore.getState();

    store.setProvider(threadId, "codex");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.provider).toBe("codex");
  });

  it("removes empty provider-only draft when provider is reset", () => {
    const store = useComposerDraftStore.getState();

    store.setProvider(threadId, "codex");
    store.setProvider(threadId, null);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });
});

describe("composerDraftStore runtime and interaction settings", () => {
  const threadId = ThreadId.makeUnsafe("thread-settings");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
  });

  it("stores runtime mode overrides in the composer draft", () => {
    const store = useComposerDraftStore.getState();

    store.setRuntimeMode(threadId, "approval-required");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.runtimeMode).toBe(
      "approval-required",
    );
  });

  it("stores interaction mode overrides in the composer draft", () => {
    const store = useComposerDraftStore.getState();

    store.setInteractionMode(threadId, "plan");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.interactionMode).toBe(
      "plan",
    );
  });

  it("removes empty settings-only drafts when overrides are cleared", () => {
    const store = useComposerDraftStore.getState();

    store.setRuntimeMode(threadId, "approval-required");
    store.setInteractionMode(threadId, "plan");
    store.setRuntimeMode(threadId, null);
    store.setInteractionMode(threadId, null);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });
});

describe("composerDraftStore skill selections", () => {
  const threadId = ThreadId.makeUnsafe("thread-skills");

  beforeEach(() => {
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
  });

  it("reconciles skill selection ranges when the prompt shifts", () => {
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, "$code-review now");
    store.setSkillSelections(threadId, [
      {
        name: "code-review",
        path: "/tmp/skills/code-review",
        rangeStart: 0,
        rangeEnd: "$code-review".length,
      },
    ]);
    store.setPrompt(threadId, "Please $code-review now");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.skillSelections).toEqual([
      {
        name: "code-review",
        path: "/tmp/skills/code-review",
        rangeStart: "Please ".length,
        rangeEnd: "Please ".length + "$code-review".length,
      },
    ]);
  });

  it("drops stale skill selections when the token is removed", () => {
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, "$code-review now");
    store.setSkillSelections(threadId, [
      {
        name: "code-review",
        path: "/tmp/skills/code-review",
        rangeStart: 0,
        rangeEnd: "$code-review".length,
      },
    ]);
    store.setPrompt(threadId, "Review this now");

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]?.skillSelections).toEqual(
      [],
    );
  });

  it("clears skill selections with the rest of the composer content", () => {
    const store = useComposerDraftStore.getState();

    store.setPrompt(threadId, "$code-review now");
    store.setSkillSelections(threadId, [
      {
        name: "code-review",
        path: "/tmp/skills/code-review",
        rangeStart: 0,
        rangeEnd: "$code-review".length,
      },
    ]);
    store.clearComposerContent(threadId);

    expect(useComposerDraftStore.getState().draftsByThreadId[threadId]).toBeUndefined();
  });
});
