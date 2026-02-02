import { describe, expect, it, vi } from "vitest";

import type { Operation, SyntropyProject, SyntropyTask } from "@/types";

import { buildLocalBackupExport, sanitizeSettingsForExport } from "./exportJson";

const mockDbState = vi.hoisted(() => {
  const tasks: SyntropyTask[] = [];
  const projects: SyntropyProject[] = [];
  const operations: Operation[] = [];

  const db = {
    tasks: { toArray: vi.fn(async () => tasks) },
    projects: { toArray: vi.fn(async () => projects) },
    operations: { toArray: vi.fn(async () => operations) },
    counters: { toArray: vi.fn(async () => []) },
    syncMetadata: { toArray: vi.fn(async () => []) },
    offlineQueue: { toArray: vi.fn(async () => []) },
    verno: 2,
  };

  return { db, tasks, projects, operations };
});

vi.mock("./db", () => ({
  db: mockDbState.db,
}));

describe("sanitizeSettingsForExport", () => {
  it("removes encrypted keys but keeps provider config", () => {
    const sanitized = sanitizeSettingsForExport({
      aiProvider: "custom",
      encryptedApiKey: "secret",
      customAIConfig: {
        name: "Legacy",
        baseUrl: "https://legacy.example.com/v1",
        model: "gpt-3.5",
      },
      theme: "system",
      geminiModel: "gemini-1.5-pro",
      selectedCustomProviderId: "cp-1",
      savedCustomProviders: [
        {
          id: "cp-1",
          name: "My Provider",
          baseUrl: "https://example.com/v1",
          model: "gpt-4o-mini",
          createdAt: "2026-01-01T00:00:00.000Z",
          encryptedApiKey: "secret-2",
        },
      ],
      savedRecipients: [
        {
          id: "r1",
          label: "Alice",
          email: "alice@example.com",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });

    expect("encryptedApiKey" in sanitized).toBe(false);
    expect(sanitized.aiProvider).toBe("custom");
    expect(sanitized.customAIConfig).toEqual({
      name: "Legacy",
      baseUrl: "https://legacy.example.com/v1",
      model: "gpt-3.5",
    });
    expect(sanitized.savedCustomProviders[0]).toEqual({
      id: "cp-1",
      name: "My Provider",
      baseUrl: "https://example.com/v1",
      model: "gpt-4o-mini",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastUsedAt: undefined,
      hasApiKey: true,
    });
    expect(sanitized.hasGlobalApiKey).toBe(true);
  });
});

describe("buildLocalBackupExport", () => {
  it("exports all local tables", async () => {
    mockDbState.tasks.push({
      id: "SYN-2026-0001",
      projectId: "PROJ-0001",
      content: "Task",
      status: "pending",
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "DEV-11111111",
      updatedBy: "DEV-11111111",
    });
    mockDbState.projects.push({
      id: "PROJ-0001",
      name: "Project",
      displayOrder: 0,
      isArchived: false,
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "DEV-11111111",
      updatedBy: "DEV-11111111",
    });
    mockDbState.operations.push({
      id: "op-1",
      type: "CREATE",
      entityType: "task",
      entityId: "SYN-2026-0001",
      afterSnapshot: "{}",
      lamportClock: 1,
      timestamp: "2026-01-01T00:00:00.000Z",
      deviceId: "DEV-11111111",
      synced: false,
    });

    const exportData = await buildLocalBackupExport({ settings: { theme: "system" } });

    expect(exportData.version).toBe(1);
    expect(typeof exportData.exportedAt).toBe("string");
    expect(exportData.data.tasks.length).toBe(1);
    expect(exportData.data.projects.length).toBe(1);
    expect(exportData.data.operations.length).toBe(1);
  });
});
