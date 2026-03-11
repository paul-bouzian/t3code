import type { ProviderRateLimitsUpdatedPayload, ThreadId } from "@t3tools/contracts";
import { useSyncExternalStore } from "react";
import { onRateLimitsUpdated, onServerWelcome } from "./wsNativeApi";

type RateLimitSnapshotMap = ReadonlyMap<ThreadId, ProviderRateLimitsUpdatedPayload>;

const EMPTY_SNAPSHOTS: RateLimitSnapshotMap = new Map();

let snapshots: RateLimitSnapshotMap = EMPTY_SNAPSHOTS;
let listeners = new Set<() => void>();
let subscriptionsStarted = false;

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function replaceSnapshots(
  nextSnapshots: Iterable<readonly [ThreadId, ProviderRateLimitsUpdatedPayload]>,
): void {
  snapshots = new Map(nextSnapshots);
  emitChange();
}

function applyRateLimitsUpdate(payload: ProviderRateLimitsUpdatedPayload): void {
  const next = new Map(snapshots);
  next.set(payload.threadId, payload);
  replaceSnapshots(next);
}

function ensureSubscriptions(): void {
  if (subscriptionsStarted) return;
  subscriptionsStarted = true;

  onServerWelcome((payload) => {
    const next =
      payload.providerRateLimitsSnapshots?.map(
        (snapshot) => [snapshot.threadId, snapshot] as const,
      ) ?? [];
    replaceSnapshots(next);
  });

  onRateLimitsUpdated((payload) => {
    applyRateLimitsUpdate(payload);
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ensureSubscriptions();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RateLimitSnapshotMap {
  return snapshots;
}

export function useRateLimits(
  threadId: ThreadId | null,
): ProviderRateLimitsUpdatedPayload["rateLimits"] | null {
  const snapshotMap = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOTS);
  if (!threadId) return null;
  return snapshotMap.get(threadId)?.rateLimits ?? null;
}
