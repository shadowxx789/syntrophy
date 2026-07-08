/**
 * Offline Operation Queue
 *
 * Queues operations when offline and syncs when connection is restored.
 * Uses IndexedDB for persistent storage.
 */

import { db } from "./db";

export type OfflineOperationType = "CREATE" | "UPDATE" | "DELETE";

export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  entityType: "task" | "project";
  entityId: string;
  payload: string; // JSON stringified
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

/**
 * Add operation to offline queue
 */
export async function queueOfflineOperation(
  type: OfflineOperationType,
  entityType: "task" | "project",
  entityId: string,
  payload: unknown
): Promise<string> {
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const operation: OfflineOperation = {
    id,
    type,
    entityType,
    entityId,
    payload: JSON.stringify(payload),
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  await db.table("offlineQueue").add(operation);

  console.log("[OfflineQueue] Queued operation:", operation);

  // Request background sync if available
  if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // @ts-expect-error - Background Sync API
      await registration.sync.register("sync-tasks");
      console.log("[OfflineQueue] Background sync registered");
    } catch (error) {
      console.log("[OfflineQueue] Background sync not available:", error);
    }
  }

  return id;
}

/**
 * Get all pending offline operations
 */
export async function getPendingOperations(): Promise<OfflineOperation[]> {
  return db.table("offlineQueue").toArray();
}

/**
 * Get count of pending operations
 */
export async function getPendingCount(): Promise<number> {
  return db.table("offlineQueue").count();
}

/**
 * Remove operation from queue (after successful sync)
 */
export async function removeOperation(id: string): Promise<void> {
  await db.table("offlineQueue").delete(id);
  console.log("[OfflineQueue] Removed operation:", id);
}

/**
 * Update operation retry count
 */
export async function markOperationFailed(id: string, error: string): Promise<void> {
  const existing = await db.table<OfflineOperation>("offlineQueue").get(id);
  if (!existing) return;
  await db.table("offlineQueue").update(id, {
    retryCount: (existing.retryCount || 0) + 1,
    lastError: error,
  });
}

/**
 * Clear all pending operations
 */
export async function clearOfflineQueue(): Promise<void> {
  await db.table("offlineQueue").clear();
  console.log("[OfflineQueue] Cleared all operations");
}

/**
 * Process offline queue when online
 *
 * This is a placeholder - actual sync logic will be implemented
 * when cloud sync is added in Phase 5.
 */
export async function processOfflineQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  if (!navigator.onLine) {
    console.log("[OfflineQueue] Still offline, skipping sync");
    return { synced: 0, failed: 0 };
  }

  const operations = await getPendingOperations();
  let synced = 0;
  let failed = 0;

  for (const operation of operations) {
    try {
      // TODO: Implement actual sync logic in Phase 5
      // For now, just remove from queue (local-only mode)
      console.log("[OfflineQueue] Processing operation:", operation.id);

      // Simulate successful sync in local-only mode
      await removeOperation(operation.id);
      synced++;
    } catch (error) {
      console.error("[OfflineQueue] Failed to process operation:", error);
      await markOperationFailed(
        operation.id,
        error instanceof Error ? error.message : "Unknown error"
      );
      failed++;
    }
  }

  console.log(`[OfflineQueue] Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Setup online/offline event listeners
 */
export function setupOfflineSync(callbacks?: {
  onOnline?: () => void;
  onOffline?: () => void;
  onSyncComplete?: (result: { synced: number; failed: number }) => void;
}): () => void {
  const handleOnline = async () => {
    console.log("[OfflineQueue] Online - processing queue");
    callbacks?.onOnline?.();

    const result = await processOfflineQueue();
    callbacks?.onSyncComplete?.(result);
  };

  const handleOffline = () => {
    console.log("[OfflineQueue] Offline");
    callbacks?.onOffline?.();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
