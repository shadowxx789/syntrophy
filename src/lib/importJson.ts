import type { ExportedSettings, LocalBackupExportV1 } from "./exportJson";
import { db } from "./db";

export interface LocalBackupImportResult {
  settings?: ExportedSettings;
  hasGlobalApiKey: boolean;
  hasCustomProviderApiKey: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function validateLocalBackupExport(value: unknown): value is LocalBackupExportV1 {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isString(value.exportedAt)) return false;

  if (!isRecord(value.app)) return false;
  if (value.app.name !== "Syntropy") return false;

  if (!isRecord(value.data)) return false;
  if (!Array.isArray(value.data.tasks)) return false;
  if (!Array.isArray(value.data.projects)) return false;
  if (!Array.isArray(value.data.operations)) return false;
  if (!Array.isArray(value.data.counters)) return false;
  if (!Array.isArray(value.data.syncMetadata)) return false;
  if (!Array.isArray(value.data.offlineQueue)) return false;

  if ("settings" in value && value.settings !== undefined) {
    if (!isRecord(value.settings)) return false;
    if (!Array.isArray(value.settings.savedCustomProviders)) return false;
    if (!isBoolean(value.settings.hasGlobalApiKey)) return false;
  }

  return true;
}

export function parseLocalBackupJson(text: string): LocalBackupExportV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("备份文件不是有效的 JSON");
  }

  if (!validateLocalBackupExport(parsed)) {
    throw new Error("备份文件格式不正确");
  }

  return parsed;
}

export async function importLocalBackupExport(
  data: LocalBackupExportV1
): Promise<LocalBackupImportResult> {
  await db.transaction(
    "rw",
    [db.tasks, db.projects, db.operations, db.counters, db.syncMetadata, db.offlineQueue],
    async () => {
      await Promise.all([
        db.tasks.clear(),
        db.projects.clear(),
        db.operations.clear(),
        db.counters.clear(),
        db.syncMetadata.clear(),
        db.offlineQueue.clear(),
      ]);

      if (data.data.tasks.length > 0) {
        await db.tasks.bulkPut(data.data.tasks);
      }
      if (data.data.projects.length > 0) {
        await db.projects.bulkPut(data.data.projects);
      }
      if (data.data.operations.length > 0) {
        await db.operations.bulkPut(data.data.operations);
      }
      if (data.data.counters.length > 0) {
        await db.counters.bulkPut(data.data.counters);
      }
      if (data.data.syncMetadata.length > 0) {
        await db.syncMetadata.bulkPut(data.data.syncMetadata);
      }
      if (data.data.offlineQueue.length > 0) {
        await db.offlineQueue.bulkPut(data.data.offlineQueue);
      }
    }
  );

  const settings = data.settings;
  const hasGlobalApiKey = !!settings?.hasGlobalApiKey;
  const hasCustomProviderApiKey =
    settings?.savedCustomProviders?.some((provider) => provider.hasApiKey) ?? false;

  return {
    settings,
    hasGlobalApiKey,
    hasCustomProviderApiKey,
  };
}

export async function importLocalBackupJson(text: string): Promise<LocalBackupImportResult> {
  const data = parseLocalBackupJson(text);
  return await importLocalBackupExport(data);
}
