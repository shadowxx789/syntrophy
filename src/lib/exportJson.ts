import type {
  AIProvider,
  Counter,
  CustomAIConfig,
  CustomPromptConfig,
  Operation,
  SavedCustomProvider,
  SavedRecipient,
  SyncMetadata,
  SyntropyProject,
  SyntropyTask,
} from "@/types";

import type { OfflineOperation } from "./offlineQueue";
import { db } from "./db";

export interface ExportedSettings {
  aiProvider?: AIProvider;
  customAIConfig?: CustomAIConfig;
  geminiModel?: string;
  theme?: "light" | "dark" | "system";
  customPrompts?: CustomPromptConfig;
  savedRecipients?: SavedRecipient[];
  selectedCustomProviderId?: string;
  savedCustomProviders: Array<
    Omit<SavedCustomProvider, "encryptedApiKey"> & {
      hasApiKey: boolean;
    }
  >;
  hasGlobalApiKey: boolean;
}

export interface LocalBackupExportV1 {
  version: 1;
  exportedAt: string;
  app: {
    name: "Syntropy";
    dexieSchemaVersion?: number;
  };
  data: {
    tasks: SyntropyTask[];
    projects: SyntropyProject[];
    operations: Operation[];
    counters: Counter[];
    syncMetadata: SyncMetadata[];
    offlineQueue: OfflineOperation[];
  };
  settings?: ExportedSettings;
}

export function sanitizeSettingsForExport(settings: {
  aiProvider?: AIProvider;
  encryptedApiKey?: string;
  customAIConfig?: CustomAIConfig;
  customPrompts?: CustomPromptConfig;
  theme?: "light" | "dark" | "system";
  geminiModel?: string;
  savedCustomProviders?: SavedCustomProvider[];
  selectedCustomProviderId?: string;
  savedRecipients?: SavedRecipient[];
}): ExportedSettings {
  const providers = settings.savedCustomProviders || [];

  return {
    aiProvider: settings.aiProvider,
    customAIConfig: settings.customAIConfig,
    geminiModel: settings.geminiModel,
    theme: settings.theme,
    customPrompts: settings.customPrompts,
    savedRecipients: settings.savedRecipients,
    selectedCustomProviderId: settings.selectedCustomProviderId,
    hasGlobalApiKey: !!settings.encryptedApiKey,
    savedCustomProviders: providers.map((p) => {
      const { encryptedApiKey: _encryptedApiKey, ...rest } = p;
      return {
        ...rest,
        hasApiKey: !!_encryptedApiKey,
      };
    }),
  };
}

export async function buildLocalBackupExport(params?: {
  settings?: Parameters<typeof sanitizeSettingsForExport>[0];
}): Promise<LocalBackupExportV1> {
  const [tasks, projects, operations, counters, syncMetadata, offlineQueue] = await Promise.all([
    db.tasks.toArray(),
    db.projects.toArray(),
    db.operations.toArray(),
    db.counters.toArray(),
    db.syncMetadata.toArray(),
    db.offlineQueue.toArray(),
  ]);

  const exportData: LocalBackupExportV1 = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: {
      name: "Syntropy",
      dexieSchemaVersion: typeof db.verno === "number" ? db.verno : undefined,
    },
    data: {
      tasks,
      projects,
      operations,
      counters,
      syncMetadata,
      offlineQueue,
    },
    settings: params?.settings ? sanitizeSettingsForExport(params.settings) : undefined,
  };

  return exportData;
}

export function downloadJsonFile(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getJsonExportFileName(prefix: string): string {
  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${prefix}-${date}.json`;
}
